import urllib.request
import json

base_url = "http://localhost:3000/api/auth/reset-password"

req = urllib.request.Request(
    base_url,
    data=json.dumps({
        'action': 'admin_reset',
        'email': 'montse@brainupgrup.com',
        'userId': '919f0fd1-5760-4a12-a91a-21512c40884b'
    }).encode('utf-8'),
    headers={'Content-Type': 'application/json'},
    method='POST'
)
with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read().decode('utf-8'))
    print("INITIAL MONTSE OTP READY:")
    print("Email:", data['email'])
    print("Temporary OTP:", data['tempPassword'])
    print("password_configured:", data['password_configured'])

