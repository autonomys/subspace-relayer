import React, { ReactElement, useContext, useEffect, useState } from "react";
import { RelayerContext, SystemContext } from "context";
import { Row, Container } from "reactstrap";
import CardHeader from "./CardHeader";

import { bytesToSize } from "./utils";

const Header: React.FC = (): ReactElement => {
  const { version } = useContext(SystemContext);
  const { feeds } = useContext(RelayerContext);
  const [totalSize, setTotalSize] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);

  useEffect(() => {
    if (feeds.length === 0) return;
    let newSize = 0;
    let newCount = 0;
    for (const feedTotal of feeds) {
      newSize += feedTotal.size;
      newCount += feedTotal.count;
    }
    setTotalSize(newSize);
    setTotalCount(newCount);
  }, [feeds]);

  return (
    <div className="header bg-gradient-gray-dark p-4">
      <Container fluid>
        <Row>
          <CardHeader
            md="2"
            title="Chains"
            content={feeds.length > 0 ? feeds.length.toString() : ""}
          />
          <CardHeader
            md="4"
            title="Storage"
            content={totalSize > 0 ? bytesToSize(totalSize) : ""}
          />
          <CardHeader
            md="4"
            title="Blocks Archived"
            content={
              totalCount > 0 ? totalCount.toLocaleString() : ""
            }
          />
          <CardHeader
            md="2"
            title="Version"
            content={version ? version.substring(0, 5) : ""}
          />
        </Row>
      </Container>
    </div>
  );
};

export default Header;
