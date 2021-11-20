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
import { parachains } from "config/AvailableParachain";
import { bytesToSize } from "./utils";

const Header = () => {
  const { version } = useContext(SystemContext);
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
                        {parachains.length}
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
                        {acumulatedSizes ? (
                          bytesToSize(acumulatedSizes)
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
                        {acumulatedObjects ? (
                          acumulatedObjects.toLocaleString()
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
