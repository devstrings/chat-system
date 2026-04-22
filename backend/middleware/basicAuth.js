import config from "#config/index";

const unauthorized = (res, message = "Unauthorized") => {
  res.set("WWW-Authenticate", 'Basic realm="MCP API"');
  return res.status(401).json({ message });
};

export const basicAuth = (req, res, next) => {
  // Prefer Proxy-Authorization so Authorization can remain Bearer PAT/JWT.
  const proxyAuthHeader = req.header("Proxy-Authorization");
  const authHeader = req.header("Authorization");
  const basicUserHeader = req.header("X-Basic-Auth-Username");
  const basicPassHeader = req.header("X-Basic-Auth-Password");

  let username;
  let password;

  if (basicUserHeader && basicPassHeader) {
    username = basicUserHeader;
    password = basicPassHeader;
  } else {
    const basicHeader =
      (proxyAuthHeader && proxyAuthHeader.startsWith("Basic ")
        ? proxyAuthHeader
        : null) ||
      (authHeader && authHeader.startsWith("Basic ") ? authHeader : null);

    if (!basicHeader) {
      return unauthorized(
        res,
        "Basic authentication required (use Proxy-Authorization or X-Basic-Auth-* headers)",
      );
    }

    const encodedCredentials = basicHeader.slice("Basic ".length).trim();
    let decoded = "";
    try {
      decoded = Buffer.from(encodedCredentials, "base64").toString("utf8");
    } catch (_err) {
      return unauthorized(res, "Invalid basic auth encoding");
    }

    const separatorIndex = decoded.indexOf(":");
    if (separatorIndex < 0) {
      return unauthorized(res, "Invalid basic auth format");
    }

    username = decoded.slice(0, separatorIndex);
    password = decoded.slice(separatorIndex + 1);
  }

  const expectedUsername = config.basicAuth.username;
  const expectedPassword = config.basicAuth.password;

  if (!expectedUsername || !expectedPassword) {
    return res
      .status(500)
      .json({ message: "Basic auth credentials are not configured" });
  }

  if (username !== expectedUsername || password !== expectedPassword) {
    return unauthorized(res, "Invalid basic auth credentials");
  }

  next();
};

export default basicAuth;
