A lightweight TypeScript service that ingests recent EVM blocks and serves [EIP-1559](https://eips.ethereum.org/EIPS/eip-1559 "EIP-1559")  gas suggestions. It learns from chain data (base fee + gas usage) with a tiny OLS model and returns sensible values for:

baseFeeGwei (predicted next-block base fee, with floors/fallbacks on testnets/L2s)

maxPriorityFeePerGasGwei (tip: from query or provider fallback)

maxFeePerGasGwei (base fee + headroom + tip)

Frontend and database integrations are planned and on developt; the API is production-ready for backend use and will be Dockerized.

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Profile-blue?logo=linkedin&style=for-the-badge)](https://www.linkedin.com/in/johan-chac%C3%B3n)


[![Personal Page]](https://www.byjohanchacon.com/)