import React, { useContext, useEffect, useState } from "react";
import { ApiPromiseContext } from "context/SubspaceContext";
import { Card, Container, Row, Table } from "reactstrap";
import { parachains } from "config/AvailableParachain";
import Header from "./Header";
import ParachainRow from "./ParachainRow";
import { ParachainProps } from "config/interfaces/Parachain";

// TODO: Move
const formatBytes = (a: number, b = 2, k = 1024): string => {
  let d = Math.floor(Math.log(a) / Math.log(k));
  return 0 === a
    ? "0 Bytes"
    : parseFloat((a / Math.pow(k, d)).toFixed(Math.max(0, b))) +
        " " +
        ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"][d];
};

const ParachainTable = () => {
  const { api, isApiReady } = useContext(ApiPromiseContext);
  const [parachainsFeed, setParachainsFeeds] = useState<ParachainProps[]>([
    ...parachains,
  ]);
  const [moreStorage, setMoreStorage] = useState<number>(0);
  const [moreBlocks, setMoreBlocks] = useState<number>(0);

  useEffect(() => {
    if (!isApiReady) return;

    api.rpc.chain
      .subscribeNewHeads(async (lastHeader) => {
        // TODO : Refactor with custom types

        const signedBlock = await api.rpc.chain.getBlock(lastHeader.hash);
        //TODO : Improve this each
        signedBlock.block.extrinsics.forEach(
          async ({ method: { method, section, args } }, index) => {
            if (section === "feeds" && method === "put") {
              const feed_id: number = api.registry
                .createType("u64", args[0])
                .toNumber();
              //TODO : Handle this if, it validates for feedId=0 as kusama block its known type
              if (feed_id === 0) {
                const data_: any = api.registry
                  .createType("Bytes", args[1])
                  .toHuman();

                const metadata_: any = api.registry
                  .createType("Bytes", args[2])
                  .toHuman();
                const metadata = JSON.parse(metadata_);

                const newParaFeed: ParachainProps = {
                  ...parachains[feed_id],
                  status: "Connected",
                  lastUpdate: Date.now(),
                  lastBlockHash: String(metadata.hash),
                  lastBlockHeight: Number(metadata.number),
                  blockSize: formatBytes(data_.length),
                  subspaceHash: signedBlock.block.header.hash.toHex(),
                };
                setParachainsFeeds((parachainsFeed) => {
                  const newParachainsFeed = [...parachainsFeed];
                  newParachainsFeed[feed_id] = newParaFeed;
                  return [...newParachainsFeed];
                });
              } else if (feed_id >= 1) {
                const data_: any = api.registry.createType("Bytes", args[1]);
                const metadata_: any = api.registry
                  .createType("Bytes", args[2])
                  .toHuman();
                const metadata = JSON.parse(metadata_);
                const newParaFeed: ParachainProps = {
                  ...parachains[feed_id],
                  status: "Connected",
                  lastUpdate: Date.now(),
                  lastBlockHash: String(metadata.hash),
                  lastBlockHeight: Number(metadata.number),
                  blockSize: formatBytes(data_.length),
                  subspaceHash: signedBlock.block.header.hash.toHex(),
                };
                setParachainsFeeds((parachainsFeed) => {
                  const newParachainsFeed = [...parachainsFeed];
                  newParachainsFeed[feed_id] = newParaFeed;
                  return [...newParachainsFeed];
                });
              }
            }
          }
        );

        let newMoreStorage = 0;
        let newMoreBlocks = 0;
        for (let i = 0; i < parachains.length; i++) {
          const total: any = await api.query.feeds.totals(parachains[i].feedId);
          const size: number = api.registry
            .createType("u64", total["size_"])
            .toNumber();
          const objects: number = api.registry
            .createType("u64", total["objects"])
            .toNumber();
          newMoreStorage += size;
          newMoreBlocks += objects;
        }
        setMoreStorage(newMoreStorage);
        setMoreBlocks(newMoreBlocks);
      })
      .catch((e) => console.error(e));
  }, [api, isApiReady]);

  return (
    <div>
      <Header acumulatedBytes={moreStorage} totalBlocks={moreBlocks}></Header>
      <Container className="pl-5 pr-5 pt-4" fluid>
        <Row>
          <div className="col">
            <Card className="shadow">
              <Table className="table-flush align-items-center" responsive>
                <thead className="thead-light">
                  <tr>
                    <th scope="col">{"Chains"}</th>
                    <th scope="col">{"Last Updated"}</th>
                    <th scope="col">{"Last Block Height"}</th>
                    <th scope="col">{"Last Block Hash"}</th>
                    <th scope="col">{"Block Size"}</th>
                    <th scope="col">{"Subspace Tx Hash"}</th>
                  </tr>
                </thead>
                <tbody>
                  {parachainsFeed?.map((parachain: ParachainProps) => (
                    <ParachainRow {...parachain} key={parachain.chain} />
                  ))}
                </tbody>
              </Table>
            </Card>
          </div>
        </Row>
      </Container>
    </div>
  );
};

export default ParachainTable;
