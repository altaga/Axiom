import { HTTPFacilitatorClient } from '@x402/core/server';

/**
 * 🔒 GEPPETTO LABS - x402 MIDDLEWARE FACTORY (JS Edition)
 */

const facilitatorClient = new HTTPFacilitatorClient({ 
  url: "https://x402.org/facilitator" 
});

export const requirePayment = (amount, token = "USDC", network = "eip155:84532") => {
  return async (c, next) => {
    const paymentSignature = c.req.header('PAYMENT-SIGNATURE');

    // Convert decimal amount to smallest unit for EVM compatibility (USDC has 6 decimals)
    const formattedAmount = token === "USDC" ? Math.floor(parseFloat(amount) * 1e6).toString() : amount;

    const requirements = {
      x402Version: 2,
      resource: {
        url: c.req.url,
        description: "Axiom Protected Agent Access"
      },
      accepts: [{
        scheme: "exact",
        network: network,
        amount: formattedAmount,
        asset: token === "USDC" ? "0x036CbD53842c5426634e7929541eC2318f3dCF7e" : token,
        payTo: "0xDF9CDf4379ae5756DcA89678b3B19f076dC5C804",
        maxTimeoutSeconds: 3600,
        extra: {
          name: "USD Coin",
          version: "2"
        }
      }]
    };

    // 1. Intercept and demand payment
    if (!paymentSignature) {
      // 🛰️ PROTOCOL CRITICAL: v2 requires Base64 encoded requirements in the PAYMENT-REQUIRED header
      const encodedReq = Buffer.from(JSON.stringify(requirements)).toString('base64');
      c.header('PAYMENT-REQUIRED', encodedReq);
      
      return c.json(requirements, 402);
    }

    // 2. Verify the x402 signature cryptographically
    try {
      // 🛰️ PROTOCOL CRITICAL: Decode the Base64 signature payload for the facilitator
      const decodedSignature = JSON.parse(Buffer.from(paymentSignature, 'base64').toString('utf8'));
      
      const isValid = await facilitatorClient.verify(decodedSignature, requirements.accepts[0]);
      if (!isValid) {
        return c.json({ error: "Invalid or expired payment signature." }, 401);
      }
    } catch (error) {
      console.error("x402 Verification Error:", error);
      return c.json({ error: "Payment verification failed." }, 500);
    }

    // 3. Payment cleared, proceed to the route logic
    await next(); 
  };
};
