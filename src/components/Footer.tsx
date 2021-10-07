import { Container, Row, Col } from "reactstrap";

const Footer = () => {
  return (
    <footer className="py-9">
      <Container>
        <Row className="align-items-end ">
          <Col>
            <div className="copyright text-center text-xl-center text-muted">
              <a
                rel="noreferrer"
                className="font-weight-bold ml-1"
                href="https://subspace.network"
                target="_blank"
              >
                {
                  `A permanent archival storage service for Polkadot and Kusama | © ${new Date().getFullYear()} Powered by the Subspace Network`
                }
                
              </a>
            </div>
          </Col>
        </Row>
      </Container>
    </footer>
  );
};

export default Footer;