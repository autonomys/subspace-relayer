import React, { ReactElement, useContext, useEffect, useState } from "react";
import { RelayerContext, SystemContext } from "context";
import { Row, Container } from "reactstrap";
import CardHeader from "./CardHeader";

import { bytesToSize } from "./utils";

const Header: React.FC = (): ReactElement => {
  const { version } = useContext(SystemContext);
  const { parachainFeeds } = useContext(RelayerContext);
  const [accumulatedSizes, setAccumulatedSizes] = useState<number>(0);
  const [accumulatedObjects, setAccumulatedObjects] = useState<number>(0);

  useEffect(() => {
    if (parachainFeeds.length === 0) return;
    let newSize = 0;
    let newCount = 0;
    for (const feedTotal of parachainFeeds) {
      if (feedTotal) {
        newSize += feedTotal.size;
        newCount += feedTotal.count;
      }
    }
    setAccumulatedSizes(newSize);
    setAccumulatedObjects(newCount);
  }, [parachainFeeds]);

  return (
    <div className="header bg-gradient-gray-dark p-4">
      <Container fluid>
        <Row>
          <CardHeader
            md="2"
            title="Chains"
            content={parachainFeeds.length > 0 ? parachainFeeds.length.toString() : ""}
          />
          <CardHeader
            md="4"
            title="Storage"
            content={accumulatedSizes > 0 ? bytesToSize(accumulatedSizes) : ""}
          />
          <CardHeader
            md="4"
            title="Blocks Archived"
            content={
              accumulatedObjects > 0 ? accumulatedObjects.toLocaleString() : ""
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
