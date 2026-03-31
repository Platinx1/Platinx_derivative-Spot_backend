const axios = require("axios");
const buildHeaders = require("./buildHeaders")

async function callApi() {
  const headers = buildHeaders({
    userId: "123",
    accountId: "456"
  });

  const res = await axios.get(
    "https://pilot-api.pi42.com/v1/some-endpoint",
    { headers }
  );

  console.log(res.data);
}