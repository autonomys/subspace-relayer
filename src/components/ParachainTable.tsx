import React, { useContext, useEffect } from "react";
import { ApiPromiseContext } from "context/SubspaceContext";
import { Table } from "reactstrap";

const ParachainTable = () => {
  const { api, isApiReady } = useContext(ApiPromiseContext);

  useEffect(() => {
    if (!isApiReady) {
      return;
    } else {
      console.log("Api ready and working on component");
      api.rpc.chain.subscribeNewHeads(async (lastHeader) => {
        const signedBlock = await api.rpc.chain.getBlock(lastHeader.hash);
        // TODO : Logs to state. Move all this data to a table row component and update on new feed update
        for (
          let index = 0;
          index < signedBlock.block.extrinsics.length;
          index++
        ) {
          const {
            meta,
            method: { args, method, section },
          } = signedBlock.block.extrinsics[index];

          console.log("-------------------------------------------------");
          console.log("Section", section);
          console.log("Method", method);
          console.log("meta", meta);
          console.log(`(${args.map((a) => a.toString()).join(", ")})`);

          const allRecords = await api.query.system.events.at(
            signedBlock.block.header.hash
          );

          const events = allRecords
            .filter(
              ({ phase }) =>
                phase.isApplyExtrinsic && phase.asApplyExtrinsic.eq(index)
            )
            .map(({ event }) => `${event.section}.${event.method}`);

          console.log("events", events);

          // TODO: Getting undefined on all events. Event timestamp set. 
          console.log(
            `${section}.${method}:: ${events.join(", ") || "no events"}`
          );
          console.log("-------------------------------------------------");
        }
      });
    }
  }, [api, isApiReady]);

  return (
    <Table className="mt-4">
      <thead>
        <tr>
          <th>Chain</th>
          <th>Status</th>
          <th>Last Updated</th>
          <th>Last Block Height</th>
          <th>Block Size</th>
          <th>Subspace Tx Hash</th>
        </tr>
      </thead>
      <tbody></tbody>
    </Table>
  );
};

export default ParachainTable;
