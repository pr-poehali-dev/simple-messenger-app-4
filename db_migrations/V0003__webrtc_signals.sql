CREATE TABLE webrtc_signals (
    id SERIAL PRIMARY KEY,
    call_id VARCHAR(64) NOT NULL,
    from_user_id INTEGER REFERENCES users(id),
    to_user_id INTEGER REFERENCES users(id),
    type VARCHAR(20) NOT NULL,
    payload TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_webrtc_signals_call ON webrtc_signals(call_id, to_user_id);
