#!/usr/bin/env bash
# STOPIX — test d'isolation du bucket `proofs` via l'API Storage réelle (après migration_7).
# Teste ce que l'app (ou un attaquant avec un compte) peut vraiment faire.
#
# Usage (Git Bash) :
#   export SUPABASE_URL=https://xxxx.supabase.co
#   export SUPABASE_ANON_KEY=eyJ...
#   export A_EMAIL=... A_PASSWORD=...      # compte de test A
#   export B_EMAIL=... B_PASSWORD=...      # compte de test B
#   export B_PATH='<uid_B>/<stop_id>/photo-123.jpg'   # un fichier existant de B
#   export A_PATH='<uid_A>/<stop_id>/photo-456.jpg'   # un fichier existant de A
#   bash supabase/tests/proofs_rls_http.sh
#
# Les chemins se trouvent dans stops.proof_url (Table Editor) ou Storage → proofs.
# Le script n'écrit rien qui réussisse dans le dossier de B ; le seul fichier
# créé est un test dans le dossier de A, supprimé à la fin.

set -u
: "${SUPABASE_URL:?}" "${SUPABASE_ANON_KEY:?}" "${A_EMAIL:?}" "${A_PASSWORD:?}" "${B_EMAIL:?}" "${B_PASSWORD:?}" "${B_PATH:?}" "${A_PATH:?}"

API="${SUPABASE_URL%/}"
FAILS=0

login() {
  curl -s "$API/auth/v1/token?grant_type=password" \
    -H "apikey: $SUPABASE_ANON_KEY" -H "Content-Type: application/json" \
    -d "{\"email\":\"$1\",\"password\":\"$2\"}" |
    sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p'
}

# check <libellé> <code HTTP obtenu> <codes attendus séparés par |>
check() {
  if [[ "|$3|" == *"|$2|"* ]]; then
    echo "PASS  $1 (HTTP $2)"
  else
    echo "FAIL  $1 (HTTP $2, attendu $3)"
    FAILS=$((FAILS + 1))
  fi
}

code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }

TOKEN_A=$(login "$A_EMAIL" "$A_PASSWORD")
TOKEN_B=$(login "$B_EMAIL" "$B_PASSWORD")
[[ -n "$TOKEN_A" && -n "$TOKEN_B" ]] || { echo "Connexion A ou B impossible"; exit 2; }
UID_A=$(echo "$A_PATH" | cut -d/ -f1)
UID_B=$(echo "$B_PATH" | cut -d/ -f1)
AUTH_A=(-H "Authorization: Bearer $TOKEN_A" -H "apikey: $SUPABASE_ANON_KEY")
AUTH_B=(-H "Authorization: Bearer $TOKEN_B" -H "apikey: $SUPABASE_ANON_KEY")

echo "── Lecture"
check "Anonyme : URL publique du fichier de B" \
  "$(code "$API/storage/v1/object/public/proofs/$B_PATH")" "400|404"
check "A lit le fichier de B" \
  "$(code "${AUTH_A[@]}" "$API/storage/v1/object/authenticated/proofs/$B_PATH")" "400|403|404"
check "A génère une URL signée pour le fichier de B" \
  "$(code -X POST "${AUTH_A[@]}" -H "Content-Type: application/json" -d '{"expiresIn":60}' \
     "$API/storage/v1/object/sign/proofs/$B_PATH")" "400|403|404"
check "A liste le dossier de B" \
  "$(curl -s -X POST "${AUTH_A[@]}" -H "Content-Type: application/json" \
     -d "{\"prefix\":\"$UID_B/\"}" "$API/storage/v1/object/list/proofs" |
     grep -q '"name"' && echo 200-avec-fichiers || echo vide)" "vide"

echo "── Écriture"
check "A uploade dans le dossier de B" \
  "$(code -X POST "${AUTH_A[@]}" -H "Content-Type: text/plain" --data 'hack' \
     "$API/storage/v1/object/proofs/$UID_B/stop-test/hack.txt")" "400|403"
check "A écrase le fichier de B (upsert)" \
  "$(code -X POST "${AUTH_A[@]}" -H "Content-Type: text/plain" -H "x-upsert: true" --data 'hack' \
     "$API/storage/v1/object/proofs/$B_PATH")" "400|403"
check "A uploade hors de tout dossier utilisateur" \
  "$(code -X POST "${AUTH_A[@]}" -H "Content-Type: text/plain" --data 'hack' \
     "$API/storage/v1/object/proofs/stop-test/hack.txt")" "400|403"
check "A supprime le fichier de B" \
  "$(curl -s -X DELETE "${AUTH_A[@]}" -H "Content-Type: application/json" \
     -d "{\"prefixes\":[\"$B_PATH\"]}" "$API/storage/v1/object/proofs" |
     grep -q "$B_PATH" && echo supprime || echo refuse)" "refuse"
check "Le fichier de B existe toujours (lu par B)" \
  "$(code "${AUTH_B[@]}" "$API/storage/v1/object/authenticated/proofs/$B_PATH")" "200"

echo "── Contrôles positifs (A sur ses propres fichiers)"
check "A lit son propre fichier" \
  "$(code "${AUTH_A[@]}" "$API/storage/v1/object/authenticated/proofs/$A_PATH")" "200"
check "A génère une URL signée pour son fichier" \
  "$(code -X POST "${AUTH_A[@]}" -H "Content-Type: application/json" -d '{"expiresIn":60}' \
     "$API/storage/v1/object/sign/proofs/$A_PATH")" "200"
check "A uploade dans son dossier" \
  "$(code -X POST "${AUTH_A[@]}" -H "Content-Type: text/plain" -H "x-upsert: true" --data 'ok' \
     "$API/storage/v1/object/proofs/$UID_A/stop-test/ok.txt")" "200"
check "A supprime son fichier de test" \
  "$(code -X DELETE "${AUTH_A[@]}" "$API/storage/v1/object/proofs/$UID_A/stop-test/ok.txt")" "200"

echo
if [[ $FAILS -eq 0 ]]; then echo "OK : isolation A/B vérifiée"; else echo "$FAILS échec(s)"; exit 1; fi
