import { useContext, useEffect, useState } from "react";
import { RelayerContext, SystemContext } from "context";
import {
  Card,
  CardBody,
  CardTitle,
  Container,
  Row,
  Col,
  Spinner,
} from "reactstrap";
import { allChains } from "config/AvailableParachain";
import { bytesToSize } from "./utils";

const Header = () => {
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

  // TODO: Card to component.
  return (
    <div className="header bg-gradient-gray-dark p-4 ">
      <Container fluid>
        <Row>
          <Col md="2">
            <Card className="card-stats mb-4 mb-xl-0">
              <CardBody>
                <Row>
                  <div className="col">
                    <CardTitle className="text-uppercase mb-0">
                      <h2 className="text-truncate">Chains</h2>
                      <h2 className="font-weight-bold text-primary">
                        {allChains.length}
                      </h2>
                    </CardTitle>
                  </div>
                </Row>
              </CardBody>
            </Card>
          </Col>
          <Col md="4">
            <Card className="card-stats mb-4 mb-xl-0">
              <CardBody>
                <Row>
                  <div className="col">
                    <CardTitle className="text-uppercase text-muted mb-0">
                      <h2 className="text-truncate">Storage</h2>
                      <h2 className="font-weight-bold text-primary">
                        {accumulatedSizes ? (
                          bytesToSize(accumulatedSizes)
                        ) : (
                          <Spinner
                            className="ml-2"
                            color="text-primary"
                            size={"sm"}
                          ></Spinner>
                        )}
                      </h2>
                    </CardTitle>
                  </div>
                </Row>
              </CardBody>
            </Card>
          </Col>
          <Col md="4">
            <Card className="card-stats mb-4 mb-xl-0">
              <CardBody>
                <Row>
                  <div className="col">
                    <CardTitle className="text-uppercase text-muted mb-0">
                      <h2 className="text-truncate">Blocks Archived</h2>
                      <h2 className="font-weight-bold text-primary">
                        {accumulatedObjects ? (
                          accumulatedObjects.toLocaleString()
                        ) : (
                          <Spinner
                            className="ml-2"
                            color="text-primary"
                            size={"sm"}
                          ></Spinner>
                        )}
                      </h2>
                    </CardTitle>
                  </div>
                </Row>
              </CardBody>
            </Card>
          </Col>

          <Col md="2">
            <Card className="card-stats mb-4 mb-xl-0">
              <CardBody>
                <Row>
                  <div className="col">
                    <CardTitle className="text-uppercase text-muted mb-0">
                      <h2 className="text-truncate">Version</h2>
                      <h2 className="font-weight-bold text-primary text-truncate">
                        {version ? (
                          version.substring(0, 5)
                        ) : (
                          <Spinner
                            className="ml-2"
                            color="text-primary"
                            size={"sm"}
                          ></Spinner>
                        )}
                      </h2>
                    </CardTitle>
                  </div>
                </Row>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Header;
