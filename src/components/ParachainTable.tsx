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
  const [moreStorage, setMoreStorage] = useState<string>("");

  useEffect(() => {
    if (!isApiReady) return;

    api.rpc.chain
      .subscribeNewHeads(async (lastHeader) => {
        const signedBlock = await api.rpc.chain.getBlock(lastHeader.hash);
        //TODO : Improve this each
        signedBlock.block.extrinsics.forEach(
          ({ method: { method, section, args } }) => {
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
                  status: "Connected",
                  lastUpdate: Date.now(),
                  lastBlockHash: String(metadata.hash),
                  lastBlockHeight: Number(metadata.number),
                  blockSize: formatBytes(data_.length),
                  subspaceHash: signedBlock.block.header.hash.toHex(),
                  ...parachains[feed_id],
                };
                setMoreStorage(args[1].toString());
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
                  status: "Connected",
                  lastUpdate: Date.now(),
                  lastBlockHash: String(metadata.hash),
                  lastBlockHeight: Number(metadata.number),
                  blockSize: formatBytes(data_.length),
                  subspaceHash: signedBlock.block.header.hash.toHex(),
                  ...parachains[feed_id],
                };
                setMoreStorage(data_.toString());
                setParachainsFeeds((parachainsFeed) => {
                  const newParachainsFeed = [...parachainsFeed];
                  newParachainsFeed[feed_id] = newParaFeed;
                  return [...newParachainsFeed];
                });
              }
            }
          }
        );
      })
      .catch((e) => console.error(e));
  }, [api, isApiReady]);

  return (
    <div>
      <Header acumulatedBytes={moreStorage}></Header>
      <Container className="pl-5 pr-5 pt-4" fluid>
        <Row>
          <div className="col">
            <Card className="shadow">
              <Table className="table-flush align-items-center" responsive>
                <thead className="thead-light">
                  <tr>
                    <th scope="col">{"Parachain"}</th>
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
