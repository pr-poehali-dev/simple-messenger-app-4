"""
Мессенджер: сообщения, диалоги, голосовые, WebRTC сигналинг, поиск по ID
"""
import json
import os
import random
import string
import base64
import psycopg2
import boto3


def get_db():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def get_s3():
    return boto3.client(
        's3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY']
    )


def json_response(data, status=200):
    return {
        'statusCode': status,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        },
        'body': json.dumps(data, default=str)
    }


def get_user_from_token(token, db):
    import jwt
    secret = os.environ.get('JWT_SECRET', '')
    try:
        payload = jwt.decode(token, secret, algorithms=['HS256'])
        user_id = payload.get('user_id')
        cur = db.cursor()
        cur.execute("SELECT id, email, name, user_uid FROM users WHERE id = %s", (user_id,))
        row = cur.fetchone()
        if not row:
            return None
        return {'id': row[0], 'email': row[1], 'name': row[2], 'user_uid': row[3]}
    except Exception:
        return None


def generate_uid():
    return ''.join(random.choices(string.digits, k=6))


def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Authorization',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }

    action = (event.get('queryStringParameters') or {}).get('action', '')
    headers = event.get('headers') or {}
    auth_header = headers.get('X-Authorization') or headers.get('Authorization') or ''
    token = auth_header.replace('Bearer ', '').strip()

    db = get_db()
    try:
        user = get_user_from_token(token, db) if token else None

        # Генерация UID при первом входе
        if user and not user.get('user_uid'):
            uid = generate_uid()
            cur = db.cursor()
            while True:
                cur.execute("SELECT id FROM users WHERE user_uid = %s", (uid,))
                if not cur.fetchone():
                    break
                uid = generate_uid()
            cur.execute("UPDATE users SET user_uid = %s WHERE id = %s", (uid, user['id']))
            db.commit()
            user['user_uid'] = uid

        # === GET CONVERSATIONS ===
        if action == 'conversations' and event.get('httpMethod') == 'GET':
            if not user:
                return json_response({'error': 'Не авторизован'}, 401)
            cur = db.cursor()
            cur.execute("""
                SELECT c.id, c.last_message_at,
                    CASE WHEN c.user1_id = %s THEN c.user2_id ELSE c.user1_id END as partner_id,
                    u.name, u.email, u.user_uid,
                    m.content as last_msg, m.type as last_type, m.sender_id as last_sender,
                    (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND is_read = false AND sender_id != %s) as unread
                FROM conversations c
                JOIN users u ON u.id = CASE WHEN c.user1_id = %s THEN c.user2_id ELSE c.user1_id END
                LEFT JOIN messages m ON m.id = (
                    SELECT id FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1
                )
                WHERE c.user1_id = %s OR c.user2_id = %s
                ORDER BY c.last_message_at DESC
            """, (user['id'], user['id'], user['id'], user['id'], user['id']))
            rows = cur.fetchall()
            convs = []
            for r in rows:
                convs.append({
                    'id': r[0],
                    'last_message_at': r[1],
                    'partner_id': r[2],
                    'partner_name': r[3] or r[4],
                    'partner_email': r[4],
                    'partner_uid': r[5],
                    'last_message': r[6],
                    'last_type': r[7],
                    'last_sender_id': r[8],
                    'unread': int(r[9])
                })
            return json_response({'conversations': convs, 'user': user})

        # === GET MESSAGES ===
        elif action == 'messages' and event.get('httpMethod') == 'GET':
            if not user:
                return json_response({'error': 'Не авторизован'}, 401)
            params = event.get('queryStringParameters') or {}
            conv_id = params.get('conversation_id')
            if not conv_id:
                return json_response({'error': 'conversation_id обязателен'}, 400)
            cur = db.cursor()
            cur.execute("SELECT id FROM conversations WHERE id = %s AND (user1_id = %s OR user2_id = %s)",
                        (conv_id, user['id'], user['id']))
            if not cur.fetchone():
                return json_response({'error': 'Нет доступа'}, 403)
            cur.execute("UPDATE messages SET is_read = true WHERE conversation_id = %s AND sender_id != %s",
                        (conv_id, user['id']))
            db.commit()
            cur.execute("""
                SELECT m.id, m.content, m.type, m.sender_id, m.is_read, m.created_at, u.name, u.email
                FROM messages m
                JOIN users u ON u.id = m.sender_id
                WHERE m.conversation_id = %s
                ORDER BY m.created_at ASC
            """, (conv_id,))
            rows = cur.fetchall()
            msgs = [{'id': r[0], 'content': r[1], 'type': r[2], 'sender_id': r[3],
                     'is_read': r[4], 'created_at': r[5], 'sender_name': r[6] or r[7],
                     'mine': r[3] == user['id']} for r in rows]
            return json_response({'messages': msgs})

        # === SEND MESSAGE ===
        elif action == 'send' and event.get('httpMethod') == 'POST':
            if not user:
                return json_response({'error': 'Не авторизован'}, 401)
            body = json.loads(event.get('body') or '{}')
            conversation_id = body.get('conversation_id')
            content = (body.get('content') or '').strip()
            msg_type = body.get('type', 'text')
            if not conversation_id or not content:
                return json_response({'error': 'conversation_id и content обязательны'}, 400)
            cur = db.cursor()
            cur.execute("SELECT id FROM conversations WHERE id = %s AND (user1_id = %s OR user2_id = %s)",
                        (conversation_id, user['id'], user['id']))
            if not cur.fetchone():
                return json_response({'error': 'Нет доступа'}, 403)
            cur.execute("""
                INSERT INTO messages (conversation_id, sender_id, content, type)
                VALUES (%s, %s, %s, %s) RETURNING id, created_at
            """, (conversation_id, user['id'], content, msg_type))
            msg_id, created_at = cur.fetchone()
            cur.execute("UPDATE conversations SET last_message_at = NOW() WHERE id = %s", (conversation_id,))
            db.commit()
            return json_response({'id': msg_id, 'created_at': created_at, 'sender_id': user['id']})

        # === UPLOAD VOICE ===
        elif action == 'upload-voice' and event.get('httpMethod') == 'POST':
            if not user:
                return json_response({'error': 'Не авторизован'}, 401)
            body = json.loads(event.get('body') or '{}')
            conversation_id = body.get('conversation_id')
            audio_b64 = body.get('audio')
            duration = body.get('duration', 0)
            if not conversation_id or not audio_b64:
                return json_response({'error': 'conversation_id и audio обязательны'}, 400)
            cur = db.cursor()
            cur.execute("SELECT id FROM conversations WHERE id = %s AND (user1_id = %s OR user2_id = %s)",
                        (conversation_id, user['id'], user['id']))
            if not cur.fetchone():
                return json_response({'error': 'Нет доступа'}, 403)

            # Загружаем в S3
            audio_data = base64.b64decode(audio_b64)
            key = f"voice/{user['id']}/{random.randint(100000, 999999)}.webm"
            s3 = get_s3()
            s3.put_object(Bucket='files', Key=key, Body=audio_data, ContentType='audio/webm')
            access_key = os.environ['AWS_ACCESS_KEY_ID']
            cdn_url = f"https://cdn.poehali.dev/projects/{access_key}/bucket/{key}"

            content = json.dumps({'url': cdn_url, 'duration': duration})
            cur.execute("""
                INSERT INTO messages (conversation_id, sender_id, content, type)
                VALUES (%s, %s, %s, 'voice') RETURNING id, created_at
            """, (conversation_id, user['id'], content))
            msg_id, created_at = cur.fetchone()
            cur.execute("UPDATE conversations SET last_message_at = NOW() WHERE id = %s", (conversation_id,))
            db.commit()
            return json_response({'id': msg_id, 'created_at': created_at, 'url': cdn_url})

        # === FIND USER BY UID ===
        elif action == 'find-user' and event.get('httpMethod') == 'GET':
            if not user:
                return json_response({'error': 'Не авторизован'}, 401)
            params = event.get('queryStringParameters') or {}
            uid = (params.get('uid') or '').strip()
            if not uid:
                return json_response({'error': 'uid обязателен'}, 400)
            cur = db.cursor()
            cur.execute("SELECT id, name, email, user_uid FROM users WHERE user_uid = %s", (uid,))
            row = cur.fetchone()
            if not row:
                return json_response({'error': 'Пользователь не найден'}, 404)
            if row[0] == user['id']:
                return json_response({'error': 'Это вы сами'}, 400)
            return json_response({'user': {'id': row[0], 'name': row[1] or row[2], 'email': row[2], 'user_uid': row[3]}})

        # === UPDATE PROFILE ===
        elif action == 'update-profile' and event.get('httpMethod') == 'POST':
            if not user:
                return json_response({'error': 'Не авторизован'}, 401)
            body = json.loads(event.get('body') or '{}')
            name = (body.get('name') or '').strip()
            if not name:
                return json_response({'error': 'Имя не может быть пустым'}, 400)
            cur = db.cursor()
            cur.execute("UPDATE users SET name = %s, updated_at = NOW() WHERE id = %s", (name, user['id']))
            db.commit()
            return json_response({'ok': True, 'name': name})

        # === START CONVERSATION ===
        elif action == 'start-conversation' and event.get('httpMethod') == 'POST':
            if not user:
                return json_response({'error': 'Не авторизован'}, 401)
            body = json.loads(event.get('body') or '{}')
            partner_id = body.get('partner_id')
            if not partner_id:
                return json_response({'error': 'partner_id обязателен'}, 400)
            cur = db.cursor()
            u1, u2 = (min(user['id'], partner_id), max(user['id'], partner_id))
            cur.execute("SELECT id FROM conversations WHERE user1_id = %s AND user2_id = %s", (u1, u2))
            row = cur.fetchone()
            if row:
                return json_response({'conversation_id': row[0]})
            cur.execute("INSERT INTO conversations (user1_id, user2_id) VALUES (%s, %s) RETURNING id", (u1, u2))
            conv_id = cur.fetchone()[0]
            db.commit()
            return json_response({'conversation_id': conv_id})

        # === WEBRTC SIGNAL SEND ===
        elif action == 'signal-send' and event.get('httpMethod') == 'POST':
            if not user:
                return json_response({'error': 'Не авторизован'}, 401)
            body = json.loads(event.get('body') or '{}')
            call_id = body.get('call_id')
            to_user_id = body.get('to_user_id')
            sig_type = body.get('type')
            raw_payload = body.get('payload', {})
            payload = json.dumps(raw_payload)
            cur = db.cursor()
            cur.execute("""
                INSERT INTO webrtc_signals (call_id, from_user_id, to_user_id, type, payload)
                VALUES (%s, %s, %s, %s, %s) RETURNING id
            """, (call_id, user['id'], to_user_id, sig_type, payload))
            sig_id = cur.fetchone()[0]
            # Если offer — дублируем на incoming канал получателя
            if sig_type == 'offer':
                incoming_payload = json.dumps({
                    'callId': call_id,
                    'fromName': user.get('name') or user.get('email'),
                    'callType': raw_payload.get('callType', 'voice'),
                    'sdp': raw_payload.get('sdp')
                })
                incoming_call_id = f"incoming-{to_user_id}"
                cur.execute("""
                    INSERT INTO webrtc_signals (call_id, from_user_id, to_user_id, type, payload)
                    VALUES (%s, %s, %s, 'offer', %s)
                """, (incoming_call_id, user['id'], to_user_id, incoming_payload))
            db.commit()
            return json_response({'ok': True, 'id': sig_id})

        # === WEBRTC SIGNAL POLL ===
        elif action == 'signal-poll' and event.get('httpMethod') == 'GET':
            if not user:
                return json_response({'error': 'Не авторизован'}, 401)
            params = event.get('queryStringParameters') or {}
            call_id = params.get('call_id')
            after_id = int(params.get('after_id', 0))
            cur = db.cursor()
            cur.execute("""
                SELECT id, from_user_id, type, payload, created_at
                FROM webrtc_signals
                WHERE call_id = %s AND to_user_id = %s AND id > %s
                ORDER BY id ASC LIMIT 20
            """, (call_id, user['id'], after_id))
            rows = cur.fetchall()
            signals = [{'id': r[0], 'from_user_id': r[1], 'type': r[2],
                        'payload': json.loads(r[3]), 'created_at': r[4]} for r in rows]
            return json_response({'signals': signals})

        # === LOG CALL ===
        elif action == 'log-call' and event.get('httpMethod') == 'POST':
            if not user:
                return json_response({'error': 'Не авторизован'}, 401)
            body = json.loads(event.get('body') or '{}')
            callee_id = body.get('callee_id')
            call_type = body.get('type', 'voice')
            status = body.get('status', 'ended')
            cur = db.cursor()
            cur.execute("""
                INSERT INTO calls (caller_id, callee_id, type, status)
                VALUES (%s, %s, %s, %s) RETURNING id
            """, (user['id'], callee_id, call_type, status))
            call_id = cur.fetchone()[0]
            db.commit()
            return json_response({'call_id': call_id})

        # === GET CALLS ===
        elif action == 'calls' and event.get('httpMethod') == 'GET':
            if not user:
                return json_response({'error': 'Не авторизован'}, 401)
            cur = db.cursor()
            cur.execute("""
                SELECT c.id, c.type, c.status, c.started_at,
                    CASE WHEN c.caller_id = %s THEN 'outgoing' ELSE 'incoming' END as direction,
                    u.name, u.email, u.user_uid,
                    CASE WHEN c.caller_id = %s THEN c.callee_id ELSE c.caller_id END as partner_id
                FROM calls c
                JOIN users u ON u.id = CASE WHEN c.caller_id = %s THEN c.callee_id ELSE c.caller_id END
                WHERE c.caller_id = %s OR c.callee_id = %s
                ORDER BY c.started_at DESC LIMIT 50
            """, (user['id'], user['id'], user['id'], user['id'], user['id']))
            rows = cur.fetchall()
            calls = [{'id': r[0], 'type': r[1], 'status': r[2], 'started_at': r[3],
                      'direction': r[4], 'partner_name': r[5] or r[6], 'partner_uid': r[7],
                      'partner_id': r[8]} for r in rows]
            return json_response({'calls': calls})

        else:
            return json_response({'error': 'Неизвестный action'}, 400)

    finally:
        db.close()