import dns from "node:dns";
import https from "node:https";

const HOST = "api-inference.huggingface.co";
const URL = `https://${HOST}`;

dns.lookup(HOST, { all: true }, (err, addresses) => {
  if (err) {
    console.error("DNS resolution failed:", err.message);
  } else {
    const ips = addresses.map((a) => a.address);
    console.log("resolved IP(s):", ips.join(", "));
  }

  console.log();

  https
    .get(URL, { timeout: 15000 }, (res) => {
      let body = "";

      console.log("status code:", res.statusCode);
      console.log("headers:", JSON.stringify(res.headers, null, 2));
      console.log();

      res.on("data", (chunk) => {
        body += chunk.toString();
      });

      res.on("end", () => {
        console.log("response body:", body);
      });
    })
    .on("error", (err) => {
      console.error("request error:", err.message);
    })
    .on("timeout", function () {
      this.destroy();
      console.error("request timed out");
    });
});