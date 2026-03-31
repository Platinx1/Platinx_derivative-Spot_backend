const crypto = require('crypto');
const axios = require('axios');


async function getRequest(endpoint, params = {}, baseUrl, apiSecret= "2ag4aj", apiKey="5ag6dj") {
    // Add a timestamp to the parameters for request uniqueness
    const timestamp = Date.now().toString();
    params.timestamp = timestamp;

    // Determine if the endpoint is a market endpoint
    const isMarketEndpoint = endpoint.startsWith("/v1/market");
    let url = "";
    const queryString = new URLSearchParams(params).toString();

    // Construct the URL based on the endpoint type
    if (isMarketEndpoint) {
        // url = `${publicBaseUrl}${endpoint}`;
        url = `${baseUrl}${endpoint}`;
    } else {
        url = `${baseUrl}${endpoint}?${queryString}`;
    }

    // Generate a signature for the request
    const signature = crypto
      .createHmac("sha256", apiSecret)
      .update(queryString)
      .digest("hex");

    try {
        // Send the GET request
        const response = await axios.get(
            url,
            !isMarketEndpoint ? {
                headers: {
                    "api-key": apiKey,
                    "signature": signature,
                },
            } : {}
        );
        // Log and return the response data
        console.log("Response:", response.data);
        return response.data;
    } catch (error) {
        // Handle and log any errors that occur during the request
        console.error(
            "Error:",
            error.response ? error.response.data : error.message
        );
    }
}


async function postRequest(endpoint, params = {}) {
  const timestamp = Date.now().toString();
  const isMarketEndpoint = endpoint.startsWith("/v1/market");
  const baseUrlToUse = isMarketEndpoint ? publicBaseUrl : baseUrl;
  const url = `${baseUrlToUse}${endpoint}`;

  if (!isMarketEndpoint) {
    params.timestamp = timestamp;
  }

  const signature = crypto
    .createHmac("sha256", apiSecret)
    .update(JSON.stringify(params))
    .digest("hex");

  try {
    const response = await axios.post(
      url,
      params,
      isMarketEndpoint
        ? {}
        : {
            headers: {
              "api-key": apiKey,
              signature: signature,
            },
          }
    );
    console.log("Response:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "Error:",
      error.response ? error.response.data : error.message
    );
    throw error; // Optional: re-throw the error if you want to handle it further up the call stack
  }
}


async function patchRequest(endpoint, params = {}) {
  const timestamp = Date.now().toString();
  const isMarketEndpoint = endpoint.startsWith('/v1/market');
  const baseUrlToUse = isMarketEndpoint ? publicBaseUrl : baseUrl;
  const url = `${baseUrlToUse}${endpoint}`;

  if (!isMarketEndpoint) {
    params.timestamp = timestamp;
  }

  const signature = crypto
    .createHmac('sha256', apiSecret)
    .update(JSON.stringify(params))
    .digest('hex');

  try {
    const response = await axios.patch(
      url,
      params,
      isMarketEndpoint
        ? {}
        : {
            headers: {
              'api-key': apiKey,
              signature: signature,
            },
          },
    );
    console.log('Response:', response.data);
    return response.data;
  } catch (error) {
    console.error(
      'Error:',
      error.response ? error.response.data : error.message,
    );
    throw error; // Optional: re-throw the error if you want to handle it further up the call stack
  }
}


async function putRequest(endpoint, params = {}) {
  const timestamp = Date.now().toString();
  params.timestamp = timestamp;

  const signature = crypto
    .createHmac("sha256", apiSecret)
    .update(JSON.stringify(params))
    .digest("hex");

  const url = `${baseUrl}${endpoint}`;

  try {
    const response = await axios.put(url, params, {
      headers: {
        "api-key": apiKey,
        "signature": signature,
      },
    });

    console.log("Response:", response.data);
    return response.data;

  } catch (error) {
    console.error(
      "Error:",
      error.response ? error.response.data : error.message
    );
  }
}


async function deleteRequest(endpoint, params = {}) {
  // Generate a timestamp and add it to the params
  const timestamp = Date.now().toString();
  params.timestamp = timestamp;

  // Create a cryptographic signature using HMAC with SHA-256
  const signature = crypto
    .createHmac("sha256", apiSecret)
    .update(JSON.stringify(params))
    .digest("hex");

  // Construct the full request URL
  const url = `${baseUrl}${endpoint}`;

  try {
    // Send the DELETE request using axios
    const response = await axios.delete(url, {
      headers: {
        "api-key": apiKey,
        "signature": signature,
      },
      data: params,
    });

    // Log and return the response data if the request is successful
    console.log("Response:", response.data);
    return response.data;

  } catch (error) {
    // Handle and log any errors that occur during the request
    console.error(
      "Error:",
      error.response ? error.response.data : error.message
    );
  }
}

module.exports = {
  getRequest,
  postRequest,
  patchRequest,
  putRequest,
  deleteRequest,
};