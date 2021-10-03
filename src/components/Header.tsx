import React, { useContext } from "react";
import { HealthContext, SystemContext } from "context";
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

// TODO: Move
const bytesToSize = (bytes: number): string => {
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = parseFloat(Math.floor(Math.log(bytes) / Math.log(1024)).toString());
  if (i === 0) return `${bytes} ${sizes[i]}`;
  return `${(bytes / 1024 ** i).toFixed(1)} ${sizes[i]}`;
};

const Header = (props: { acumulatedBytes: number; totalBlocks: number }) => {
  const { version } = useContext(SystemContext);
  const { isSyncing, best } = useContext(HealthContext);

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
                      <h2>Parachains</h2>
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
          <Col lg="2">
            <Card className="card-stats mb-4 mb-xl-0">
              <CardBody>
                <Row>
                  <div className="col">
                    <CardTitle className="text-uppercase mb-0">
                      <h2>Blocks</h2>
                      <span className="h2 font-weight-bold mb-0 text-primary">
                        {!isSyncing && best && "# " + best.toLocaleString()}
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
                      <i className="fas fa-cubes"></i>
                    </div>
                  </Col>
                </Row>
              </CardBody>
            </Card>
          </Col>
          <Col lg="3">
            <Card className="card-stats mb-4 mb-xl-0">
              <CardBody>
                <Row>
                  <div className="col">
                    <CardTitle className="text-uppercase text-muted mb-0">
                      <h2>Relayer Storage</h2>
                      <span className="h2 font-weight-bold mb-0 text-primary">
                        {props.acumulatedBytes &&
                          bytesToSize(props.acumulatedBytes)}
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
          <Col lg="3">
            <Card className="card-stats mb-4 mb-xl-0">
              <CardBody>
                <Row>
                  <div className="col">
                    <CardTitle className="text-uppercase text-muted mb-0">
                      <h2>Stored Blocks</h2>
                      <span className="h2 font-weight-bold mb-0 ml-2 text-primary">
                        {props.totalBlocks &&
                          props.totalBlocks.toLocaleString()}
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
                  <Col className="col-auto">
                    <div className="icon icon-shape bg-primary text-white rounded-circle shadow icon-md">
                      <i className="fas fa-code-branch" />
                    </div>
                  </Col>
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
