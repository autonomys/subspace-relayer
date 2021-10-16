import React, { useContext, useEffect, useState } from "react";
import { ApiPromiseContext, RelayerContextProvider } from "context";
import { Card, Container, Row, Table } from "reactstrap";
import { parachains } from "config/AvailableParachain";
import Header from "./Header";
import ParachainRow from "./ParachainRow";
import { ParachainProps } from "config/interfaces/Parachain";
import { bytesToSize } from "components/utils";

const ParachainTable = () => {
  const { api, isApiReady } = useContext(ApiPromiseContext);
  const [parachainsFeed, setParachainsFeeds] = useState<ParachainProps[]>([
    ...parachains,
  ]);

  useEffect(() => {
    if (!isApiReady) return;

    api.rpc.chain
      .subscribeNewHeads(async (lastHeader) => {
        // TODO : Refactor with custom types

        const signedBlock = await api.rpc.chain.getBlock(lastHeader.hash);
        //TODO : Improve this each
        signedBlock.block.extrinsics.forEach(
          async ({ method: { method, section, args } }) => {
            if (section === "feeds" && method === "put") {
              const feed_id: number = api.registry
                .createType("u64", args[0])
                .toNumber();
              const data: any = api.registry
                .createType("Bytes", args[1])
                .toHuman();
              const metadata = JSON.parse(
                api.registry.createType("Bytes", args[2]).toHuman() as string
              );
              const newParaFeed: ParachainProps = {
                ...parachains[feed_id],
                status: "Connected",
                lastUpdate: Date.now(),
                lastBlockHash: String(metadata.hash),
                lastBlockHeight: Number(metadata.number),
                blockSize: bytesToSize(data.length),
                subspaceHash: signedBlock.block.header.hash.toHex(),
              };
              setParachainsFeeds((parachainsFeed) => {
                const newParachainsFeed = [...parachainsFeed];
                newParachainsFeed[feed_id] = newParaFeed;
                return [...newParachainsFeed];
              });
            }
          }
        );
      })
      .catch((e) => console.error(e));
  }, [api, isApiReady]);

  return (
    <div>
      <RelayerContextProvider>
        <Header />
      </RelayerContextProvider>
      <Container className="pl-5 pr-5 pt-4" fluid>
        <Row>
          <div className="col">
            <Card className="shadow">
              <Table className="table-flush align-items-center" responsive>
                <thead className="thead-light">
                  <tr>
                    <th scope="col">{"Chains"}</th>
                    <th scope="col">{"Last Updated"}</th>
                    <th scope="col" className="text-left">
                      {"Last Block Hash"}
                    </th>
                    <th scope="col" className="text-left">
                      {"Last Block Height"}
                    </th>
                    <th scope="col">{"Last Block Size"}</th>
                    <th scope="col" className="text-right">
                      {"Subspace Tx Hash"}
                    </th>
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
