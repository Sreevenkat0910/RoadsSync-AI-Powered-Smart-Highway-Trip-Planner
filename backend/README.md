# Backend (Spring Boot)

This folder contains the Spring Boot backend for RoadsSync, including REST APIs, business logic, persistence, and integrations (auth, external traffic sources, etc.).

## Run the backend
From the `backend` folder:

```bash
mvn spring-boot:run
```

Or build then run:

```bash
mvn clean package
java -jar target/roadsync-backend-0.0.1-SNAPSHOT.jar
```

## Test endpoint
Once running, test:

```bash
curl http://localhost:8080/api/test
```

Expected response:

```text
RoadSync backend is running
```

## API key management (secure pattern)
**Do not hardcode API keys** in Java files, `application.properties`, or frontend code. Use environment variables (or a secrets manager in production) and keep local keys in `.env` (ignored by git).

### Read keys from environment variables (Java)
In Spring Boot, you can read environment variables via configuration properties or `@Value`.

Example (recommended: properties binding):
- `GOOGLE_MAPS_API_KEY` → used by backend when calling external routing APIs
- `GOOGLE_PLACES_API_KEY` → used by backend when calling external places/stops APIs

### `application.properties` example
Create/update `backend/src/main/resources/application.properties`:

```properties
# Never commit real keys here. These resolve from environment variables.
external.google.maps.api-key=${GOOGLE_MAPS_API_KEY:}
external.google.places.api-key=${GOOGLE_PLACES_API_KEY:}
```

If the backend must call Google APIs, prefer calling them **server-side** so keys are not exposed to the browser.

