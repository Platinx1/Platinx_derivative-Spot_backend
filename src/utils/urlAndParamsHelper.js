function buildUrlAndParams(basePath, queryObj = {}, bodyObj = null) {
  const queryString = new URLSearchParams(queryObj).toString();
  const fullPath = queryString ? `${basePath}?${queryString}` : basePath;
  const fullUrl = `${process.env.BASE_URL}${fullPath}`;

  return { fullUrl, queryObj, fullPath, bodyObj };
}

function buildUrlAndParamsDMA(basePath, queryObj = {}, bodyObj = null) {
  const queryString = new URLSearchParams(queryObj).toString();
  const fullPath = queryString ? `${basePath}?${queryString}` : basePath;
  const fullUrl = `${process.env.BASE_URL_DMA}${fullPath}`;

  return { fullUrl, queryObj, fullPath, bodyObj };
}

module.exports = { buildUrlAndParams, buildUrlAndParamsDMA };