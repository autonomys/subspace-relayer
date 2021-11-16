# subspace-relayer

A permanent archival storage service for Polkadot and Kusama.

Check the following instructions to run this project.

## [Backend](backend)

Node.js app which subscribes to the blocks on the source chain and sends block data to the Subspace chain as an extrinsic.
Transactions are signed and sent by the Subspace chain account, which is derived from the seed.

## [Frontend](frontend)
React app to display the current status for archived parablocks on the Subspace Network. 
Using @polkadot/api to connect to the Network.

