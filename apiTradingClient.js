const axios = require("axios");
const ed = require("@noble/ed25519");

class ApiTradingClient {
    constructor(secretKey, apiKey) {
        this.secretKey = secretKey;
        this.apiKey = apiKey;
        this.baseUrl = "https://coinswitch.co";

        this.headers = {
            "Content-Type": "application/json"
        };
    }

    signatureMessage(method, endpoint, payload = {}) {
        return (
            method +
            endpoint +
            JSON.stringify(payload, Object.keys(payload).sort())
        );
    }

    async getSignature(requestString) {
        try {
            const privateKey = Buffer.from(this.secretKey, "hex");
            const message = new TextEncoder().encode(requestString);

            const signature = await ed.sign(message, privateKey);

            return Buffer.from(signature).toString("hex");
        } catch (err) {
            console.error(err);
            return null;
        }
    }

    async callApi(url, method, headers = {}, payload = {}) {
        try {
            const response = await axios({
                url,
                method,
                headers,
                data: payload
            });

            return response.data;
        } catch (err) {
            if (err.response) {
                console.log(err.response.status);
                return err.response.data;
            }

            throw err;
        }
    }

    async makeRequest(method, endpoint, payload = {}, params = {}) {
        let finalEndpoint = endpoint;

        if (method === "GET" && Object.keys(params).length > 0) {
            const query = new URLSearchParams(params).toString();
            finalEndpoint += "?" + query;
        }

        const signatureMsg = this.signatureMessage(
            method,
            finalEndpoint,
            {}
        );

        const signature = await this.getSignature(signatureMsg);

        if (!signature) {
            return {
                message: "Invalid Secret Key"
            };
        }

        const headers = {
            ...this.headers,
            "X-AUTH-SIGNATURE": signature,
            "X-AUTH-APIKEY": this.apiKey
        };

        return await this.callApi(
            this.baseUrl + finalEndpoint,
            method,
            headers,
            payload
        );
    }

    removeTrailingZeros(obj) {
        Object.keys(obj).forEach(key => {
            if (
                typeof obj[key] === "number" &&
                Number.isInteger(obj[key])
            ) {
                obj[key] = parseInt(obj[key]);
            }
        });

        return obj;
    }

    ping() {
        return this.makeRequest("GET", "/trade/api/v2/ping");
    }

    validateKeys() {
        return this.makeRequest("GET", "/trade/api/v2/validate/keys");
    }

    createOrder(payload) {
        payload = this.removeTrailingZeros(payload);
        return this.makeRequest(
            "POST",
            "/trade/api/v2/order",
            payload
        );
    }

    cancelOrder(payload) {
        return this.makeRequest(
            "DELETE",
            "/trade/api/v2/order",
            payload
        );
    }

    getOpenOrders(params = {}) {
        return this.makeRequest(
            "GET",
            "/trade/api/v2/orders",
            {},
            params
        );
    }

    getClosedOrders(params = {}) {
        params.open = false;

        return this.makeRequest(
            "GET",
            "/trade/api/v2/orders",
            {},
            params
        );
    }

    getUserPortfolio() {
        return this.makeRequest(
            "GET",
            "/trade/api/v2/user/portfolio"
        );
    }

    get24hAllPairsData(params = {}) {
        return this.makeRequest(
            "GET",
            "/trade/api/v2/24hr/all-pairs/ticker",
            {},
            params
        );
    }

    get24hCoinPairData(params = {}) {
        return this.makeRequest(
            "GET",
            "/trade/api/v2/24hr/ticker",
            {},
            params
        );
    }

    getDepth(params = {}) {
        return this.makeRequest(
            "GET",
            "/trade/api/v2/depth",
            {},
            params
        );
    }

    getTrades(params = {}) {
        return this.makeRequest(
            "GET",
            "/trade/api/v2/trades",
            {},
            params
        );
    }

    getCandlestickData(params = {}) {
        return this.makeRequest(
            "GET",
            "/trade/api/v2/candles",
            {},
            params
        );
    }

    getExchangePrecision(payload = {}) {
        return this.makeRequest(
            "POST",
            "/trade/api/v2/exchangePrecision",
            payload
        );
    }

    getTradeInfo(params = {}) {
        return this.makeRequest(
            "GET",
            "/trade/api/v2/tradeInfo",
            {},
            params
        );
    }

    getTradingFee(params = {}) {
        return this.makeRequest(
            "GET",
            "/trade/api/v2/tradingFee",
            {},
            params
        );
    }

    getCoins(params = {}) {
        return this.makeRequest(
            "GET",
            "/trade/api/v2/coins",
            {},
            params
        );
    }
}

module.exports = ApiTradingClient;