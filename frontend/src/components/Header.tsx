import React, { useContext, useEffect, useState } from "react";
import { HealthContext, RelayerContext, SystemContext } from "context";
import {
  Card,
  CardBody,
  CardTitle,
  Container,
  Row,
  Col,
  Spinner,
} from "reactstrap";
import { parachains } from "config/AvailableParachain";
import { bytesToSize } from "./utils";

const Header = () => {
  const { version } = useContext(SystemContext);
  const { isSyncing } = useContext(HealthContext);
  const { feedsTotals } = useContext(RelayerContext);
  const [acumulatedSizes, setAcumulatedSizes] = useState<number>();
  const [acumulatedObjects, setAcumulatedObjects] = useState<number>();

  useEffect(() => {
    if (feedsTotals) {
      const acumulatedSizes = feedsTotals.reduce(
        (accumulator, currentValue) =>
          accumulator + currentValue?.size_.toNumber() || 0,
        0
      );
      const acumulatedObjects = feedsTotals.reduce(
        (accumulator, currentValue) =>
          accumulator + currentValue?.count.toNumber() || 0,
        0
      );
      setAcumulatedSizes(acumulatedSizes);
      setAcumulatedObjects(acumulatedObjects);
    }
  }, [feedsTotals]);
  
  // TODO: Card to component.
  return (
    <div className="header bg-gradient-gray-dark pb-4 pt-2 pt-md-4 pl-4 pr-9 ">
      <Container fluid>
        <Row>
          <Col lg="2">
            <Card className="card-stats mb-4 mb-xl-0">
              <CardBody>
                <Row>
                  <div className="col">
                    <CardTitle className="text-uppercase mb-0">
                      <h2>Chains</h2>
                      <span className="h2 font-weight-bold mb-0 text-primary">
                        {parachains.length - 1}
                        {isSyncing && (
                          <Spinner
                            className="ml-2"
                            color="text-primary"
                            size={"6"}
                          ></Spinner>
                        )}
                      </span>
                    </CardTitle>
                  </div>
                </Row>
              </CardBody>
            </Card>
          </Col>
          <Col lg="4">
            <Card className="card-stats mb-4 mb-xl-0">
              <CardBody>
                <Row>
                  <div className="col">
                    <CardTitle className="text-uppercase text-muted mb-0">
                      <h2>Total Storage</h2>
                      <span className="h2 font-weight-bold mb-0 text-primary">
                        {acumulatedSizes && bytesToSize(acumulatedSizes)}
                        {isSyncing && (
                          <Spinner
                            className="ml-2"
                            color="text-primary"
                            size={"6"}
                          ></Spinner>
                        )}
                      </span>
                    </CardTitle>
                  </div>
                  <Col className="col-auto">
                    <div className="icon icon-shape bg-primary text-white rounded-circle shadow icon-md">
                      <i className="fas fa-archive" />
                    </div>
                  </Col>
                </Row>
              </CardBody>
            </Card>
          </Col>
          <Col lg="4">
            <Card className="card-stats mb-4 mb-xl-0">
              <CardBody>
                <Row>
                  <div className="col">
                    <CardTitle className="text-uppercase text-muted mb-0">
                      <h2>Total Blocks Archived</h2>
                      <span className="h2 font-weight-bold mb-0 ml-2 text-primary">
                        {acumulatedObjects &&
                          acumulatedObjects.toLocaleString()}
                      </span>
                    </CardTitle>
                  </div>
                  <Col className="col-auto">
                    <div className="icon icon-shape bg-primary text-white rounded-circle shadow icon-md">
                      <i className="fas fa-archive" />
                    </div>
                  </Col>
                </Row>
              </CardBody>
            </Card>
          </Col>

          <Col lg="2">
            <Card className="card-stats mb-4 mb-xl-0">
              <CardBody>
                <Row>
                  <div className="col">
                    <CardTitle className="text-uppercase text-muted mb-0">
                      <h2>Version</h2>
                      <span className="h2 font-weight-bold mb-0 text-primary">
                        {version?.substring(0, 5)}
                        {isSyncing && (
                          <Spinner
                            className="ml-2"
                            color="text-primary"
                            size={"6"}
                          ></Spinner>
                        )}
                      </span>
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
