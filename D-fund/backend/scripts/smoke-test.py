import json
import time
from urllib import request

BASE = "http://localhost:3001/api/v1"


def http(method, path, data=None, token=None):
    url = BASE + path
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = request.Request(url, method=method, headers=headers)
    if data is not None:
        body = json.dumps(data).encode("utf-8")
        req.data = body
    try:
        with request.urlopen(req) as resp:
            body = resp.read().decode("utf-8")
            return resp.status, json.loads(body) if body else None
    except request.HTTPError as e:
        body = e.read().decode("utf-8")
        try:
            payload = json.loads(body)
        except Exception:
            payload = body
        return e.code, payload


def main():
    print("1) GET /opportunities")
    status, data = http("GET", "/opportunities?take=1")
    print("status", status)

    stamp = int(time.time())
    email = f"test.user.{stamp}@example.com"
    password = "Password123!"

    print("2) POST /auth/register")
    status, data = http(
        "POST",
        "/auth/register",
        {
            "email": email,
            "password": password,
            "firstName": "Test",
            "lastName": "User",
        },
    )
    print("status", status)
    if status not in (200, 201):
        print("register failed", data)
        raise SystemExit(1)

    user = data["user"]
    token = data["token"]

    print("3) POST /opportunities")
    status, opp = http(
        "POST",
        "/opportunities",
        {
            "name": "Test Opportunity",
            "type": "JOB_OPPORTUNITY",
            "description": "Opportunity created during smoke test",
            "status": "DRAFT",
        },
        token=token,
    )
    print("status", status)
    if status not in (200, 201):
        print("create opportunity failed", opp)
        raise SystemExit(1)

    opp_id = opp["id"]

    print("4) POST /applications")
    status, app = http(
        "POST",
        "/applications",
        {
            "opportunityId": opp_id,
            "title": "Candidature test",
            "goalLetter": "Je suis intéressé.",
        },
        token=token,
    )
    print("status", status)
    if status not in (200, 201):
        print("create application failed", app)
        raise SystemExit(1)

    app_id = app["id"]

    print("5) POST /applications/:id/submit")
    status, app_submit = http("POST", f"/applications/{app_id}/submit", token=token)
    print("status", status)

    print("6) PUT /applications/:id/review")
    status, app_review = http(
        "PUT",
        f"/applications/{app_id}/review",
        {
            "stage": "OWNER_REVIEW",
            "feedbackTitle": "En cours",
            "reviewFeedback": "Review initiale.",
        },
        token=token,
    )
    print("status", status)

    print("7) GET /applications/user/:userId")
    status, data = http("GET", f"/applications/user/{user['id']}")
    print("status", status)

    print("8) GET /applications/opportunity/:opportunityId")
    status, data = http("GET", f"/applications/opportunity/{opp_id}")
    print("status", status)

    print("DONE")


if __name__ == "__main__":
    main()
