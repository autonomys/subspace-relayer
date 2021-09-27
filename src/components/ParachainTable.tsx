import React from "react";
import { Table } from "reactstrap";

const ParachainTable = () => {
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
