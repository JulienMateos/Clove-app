#!/usr/bin/env bash
# End-to-end test of the Clove match flow (two users).
set -e
B=http://localhost:4000
J='Content-Type: application/json'
tok() { echo "$1" | grep -o '"token":"[^"]*' | cut -d'"' -f4; }
stat() { echo "$1" | grep -o '"status":"[^"]*' | cut -d'"' -f4; }

CONSENT='"consent":{"terms":true,"location":true}'
AT=$(tok "$(curl -s -X POST $B/api/register -H "$J" -d "{\"username\":\"Alice\",\"gender\":\"femme\",\"attraction\":\"homme\",\"socialStyle\":\"extraverti\",\"avatar\":\"U\",$CONSENT}")")
BT=$(tok "$(curl -s -X POST $B/api/register -H "$J" -d "{\"username\":\"Bob\",\"gender\":\"homme\",\"attraction\":\"femme\",\"socialStyle\":\"extraverti\",\"avatar\":\"F\",$CONSENT}")")
echo "tokens: Alice=${AT:0:6} Bob=${BT:0:6}"

curl -s -X POST $B/api/mode -H "$J" -H "Authorization: Bearer $AT" -d '{"mode":"full"}' >/dev/null
curl -s -X POST $B/api/mode -H "$J" -H "Authorization: Bearer $BT" -d '{"mode":"full"}' >/dev/null

curl -s -X POST $B/api/heartbeat -H "$J" -H "Authorization: Bearer $AT" -d '{"lat":40.9481,"lng":-4.1184,"radius":120,"mode":"full"}' >/dev/null
HB=$(curl -s -X POST $B/api/heartbeat -H "$J" -H "Authorization: Bearer $BT" -d '{"lat":40.94828,"lng":-4.1184,"radius":120,"mode":"full"}')
SID=$(echo "$HB" | grep -o '"sessionId":"[^"]*' | cut -d'"' -f4)
DIST=$(echo "$HB" | grep -o '"distance":[0-9]*' | head -1 | cut -d: -f2)
echo "session=$SID distance=${DIST}m"
[ -z "$SID" ] && { echo "FAIL: no session"; exit 1; }

curl -s -X POST $B/api/session/$SID/interest -H "$J" -H "Authorization: Bearer $AT" -d '{"interested":true}' >/dev/null
R=$(curl -s -X POST $B/api/session/$SID/interest -H "$J" -H "Authorization: Bearer $BT" -d '{"interested":true}')
echo "after interest: $(stat "$R")"

# A valid 1x1 PNG (passes the content filter's type + min-size checks)
PNG="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
curl -s -X POST $B/api/session/$SID/photo -H "$J" -H "Authorization: Bearer $AT" -d "{\"photoUrl\":\"$PNG\"}" >/dev/null
R=$(curl -s -X POST $B/api/session/$SID/photo -H "$J" -H "Authorization: Bearer $BT" -d "{\"photoUrl\":\"$PNG\"}")
echo "after photos: $(stat "$R")"

# Verify Bob can now see Alice's photo (review reveals it)
echo "Bob sees other photo? $(echo "$R" | grep -o '"otherPhoto":"[^"]*' | cut -d'"' -f4 | head -c 20)"

curl -s -X POST $B/api/session/$SID/review -H "$J" -H "Authorization: Bearer $AT" -d '{"accept":true}' >/dev/null
R=$(curl -s -X POST $B/api/session/$SID/review -H "$J" -H "Authorization: Bearer $BT" -d '{"accept":true}')
echo "after review: $(stat "$R")"
echo "meeting spot: $(echo "$R" | grep -o '"name":"[^"]*' | head -1 | cut -d'"' -f4)"
echo "revealed bio field present? $(echo "$R" | grep -o '"gender":"[^"]*' | head -1)"

# Matches + chat
MID=$(curl -s $B/api/matches -H "Authorization: Bearer $AT" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
echo "match id: $MID"
curl -s -X POST $B/api/matches/$MID/messages -H "$J" -H "Authorization: Bearer $AT" -d '{"body":"Salut, ce brocoli mimé etait top"}' >/dev/null
MSGS=$(curl -s $B/api/matches/$MID/messages -H "Authorization: Bearer $BT")
echo "Bob sees messages: $(echo "$MSGS" | grep -o '"body":"[^"]*' | cut -d'"' -f4)"

# Negative test: incompatible pair should NOT match (Carol likes women, Bob is homme)
CT=$(tok "$(curl -s -X POST $B/api/register -H "$J" -d "{\"username\":\"Carol\",\"gender\":\"femme\",\"attraction\":\"femme\",\"socialStyle\":\"extraverti\",$CONSENT}")")
curl -s -X POST $B/api/mode -H "$J" -H "Authorization: Bearer $CT" -d '{"mode":"full"}' >/dev/null
HB2=$(curl -s -X POST $B/api/heartbeat -H "$J" -H "Authorization: Bearer $CT" -d '{"lat":40.9481,"lng":-4.1184,"radius":120,"mode":"full"}')
S2=$(echo "$HB2" | grep -o '"sessionId":"[^"]*' | cut -d'"' -f4)
echo "incompatible Carol session (should be empty): '${S2}'"

echo "ALL DONE"
