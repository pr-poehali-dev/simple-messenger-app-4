"""
Возвращает ICE/TURN конфигурацию для WebRTC звонков
"""
import os
import json
import urllib.request


def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Authorization',
            },
            'body': ''
        }

    api_key = os.environ.get('METERED_API_KEY', '')
    app_name = os.environ.get('METERED_APP_NAME', 'messenger')

    ice_servers = []

    if api_key:
        try:
            url = f'https://{app_name}.metered.live/api/v1/turn/credentials?apiKey={api_key}'
            req = urllib.request.Request(url, headers={'Accept': 'application/json'})
            with urllib.request.urlopen(req, timeout=5) as resp:
                data = json.loads(resp.read())
                ice_servers = data
        except Exception as e:
            print(f'Metered API error: {e}')

    # Резерв если API не ответил
    if not ice_servers:
        ice_servers = [
            {'urls': 'stun:stun.l.google.com:19302'},
            {'urls': 'stun:stun1.l.google.com:19302'},
        ]

    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        },
        'body': json.dumps({'ice_servers': ice_servers})
    }
