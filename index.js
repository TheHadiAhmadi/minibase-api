const polka = require("polka");

const app = polka();

app.use((req, res, next) => {
  const host = req.headers.host;

  const splitted = host.split(".");
  if (splitted.length == 2 && splitted[1].startsWith("localhost")) {
    req.subdomain = splitted[0];
    return next();
  } else if (splitted.length > 2) {
    req.subdomain = splitted[0];
    next();
  }
});

app.use((req, res) => {
  console.log(req.url, req.baseUrl, req.originalUrl);
  console.log(req.headers.host, req.subdomain);

  res.end("Subdomain is: " + req.subdomain);
});

app.listen(3000);
console.log("listening on port 3000");
