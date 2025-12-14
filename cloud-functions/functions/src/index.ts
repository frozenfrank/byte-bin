/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {setGlobalOptions} from "firebase-functions";
import {onRequest} from "firebase-functions/https";
// import * as logger from "firebase-functions/logger";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({maxInstances: 10});

export const helloWorld = onRequest((req, res) => {
  // logger.info("Hello logs!", {structuredData: true});
  res.set("Access-Control-Allow-Origin", "*");
  res.send(`Hello from Firebase!<br>${new Date().toISOString()}`);
});

/** Headers that are allowed to be forwarded via proxy */
const ALLOWED_FORWARD_HEADERS = [
  "Authorization",
  "Content-Type",
];

/** Request types that are allowed to be forwarded via proxy */
const ALLOWED_FORWARD_METHODS = [
  "GET",
  "POST",
  "DELETE",
  "OPTIONS",
];

export const proxy = onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Credentials", "true");

  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    // Send response to OPTIONS requests
    res.set("Access-Control-Allow-Methods", ALLOWED_FORWARD_METHODS.join(", "));
    res.set("Access-Control-Allow-Headers", ALLOWED_FORWARD_HEADERS.join(", "));
    res.set("Access-Control-Max-Age", "3600");
    res.status(204).send("");
    return;
  } else if (ALLOWED_FORWARD_METHODS.indexOf(req.method)<0) {
    res.status(405).send("Method Not Allowed");
    return;
  }

  const targetUrl = req.query.url;
  if (typeof targetUrl !== "string" || !targetUrl) {
    res.status(400).send("Missing 'url' query parameter");
    return;
  }


  try {
    // Forward the request to the target URL
    const forwardHeaders: HeadersInit = {};
    const forwardRequest: RequestInit = {
      method: req.method,
      headers: forwardHeaders,
    };
    for (const header of ALLOWED_FORWARD_HEADERS) {
      const value = req.get(header);
      if (value === undefined) continue;
      forwardHeaders[header] = value;
    }
    if (req.rawBody) forwardRequest.body = req.rawBody as BodyInit;

    const fetchResponse = await fetch(targetUrl, forwardRequest);

    // Relay the response back to the client
    const data = await fetchResponse.text();
    fetchResponse.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    res.status(fetchResponse.status).send(data);
  } catch (error) {
    res.status(500).send(`Error proxying request: ${error}`);
  }
});
