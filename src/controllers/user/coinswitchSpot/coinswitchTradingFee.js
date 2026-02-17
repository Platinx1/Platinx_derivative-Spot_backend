const axios = require('axios');
const catchAsync = require('../../../utils/catchAsync');
const AppError = require('../../../utils/AppError');
const { getAuthHeaders } = require('../../../utils/signatureHelper');
const { buildUrlAndParams } = require('../../../utils/urlAndParamsHelper'); 


const ENDPOINTS = {
  TRADING_FEE: '/trade/api/v2/tradingFee'
};

const handleApiResponse = (res, message, data) => {
  res.status(200).json({
    success: true,
    message,
    data,
  });
};


exports.getSpotTradingFee = catchAsync(async (req, res, next) => {
  const { exchange } = req.query;

  // Required validation
  if (!exchange || typeof exchange !== 'string' || exchange.trim() === '') {
    return next(new AppError('exchange is a required query parameter', 400));
  }

  const normalizedExchange = exchange.toLowerCase().trim();
  const validExchanges = ['coinswitchx', 'wazirx', 'c2c1', 'c2c2'];

  if (!validExchanges.includes(normalizedExchange)) {
    return next(
      new AppError(
        `Invalid exchange value. Allowed: ${validExchanges.join(', ')} (case insensitive)`,
        400
      )
    );
  }

  const queryObj = {
    exchange: normalizedExchange,
  };

  const method = 'GET';
  const path = ENDPOINTS.TRADING_FEE;
  const payload = null; // No body

  const { fullUrl } = buildUrlAndParams(path, queryObj);

  // Generate signature (your helper is already correct: no body for GET)
  const headers = getAuthHeaders(method, path, queryObj, payload);

  console.log('Fetching trading fee for exchange:', normalizedExchange);
  console.log('Full URL:', fullUrl);
  console.log('Headers (masked):', {
    ...headers,
    'X-AUTH-SIGNATURE': headers['X-AUTH-SIGNATURE']?.slice(0, 10) + '...' || 'missing',
  });

  try {
    const response = await axios({
      method,
      url: fullUrl,
      headers,
      // no data for GET
    });

    handleApiResponse(res, 'Trading fee information retrieved successfully', response.data);
  } catch (error) {
    if (error.response) {
      const { status, data } = error.response;

      if (status === 400) {
        return next(new AppError(data.message || 'Bad request – invalid exchange parameter', 400));
      }
      if (status === 401) {
        return next(new AppError('Unauthorized – invalid API key or signature', 401));
      }
      if (status === 422) {
        return next(new AppError(data.message || 'Validation error', 422));
      }
      if (status === 500) {
        return next(new AppError('CoinSwitch internal server error – please try again later', 500));
      }

      return next(new AppError(`CoinSwitch API error: ${data.message || 'Unknown error'}`, status));
    }

    // Network / timeout / DNS issues
    return next(new AppError('Failed to connect to CoinSwitch API', 503));
  }
});
