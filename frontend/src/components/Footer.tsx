import React, { ReactElement } from 'react';
import { Container, Row, Col } from "reactstrap";

const Footer: React.FC = (): ReactElement => {
  return (
    <footer className="pt-5 pb-5">
      <Container>
        <Row className="align-items-end">
          <Col>
            <div className="copyright text-center text-xl-center text-muted">
              <a
                rel="noreferrer"
                className="font-weight-bold ml-1"
                href="https://subspace.network"
                target="_blank"
              >
                {
                  `© ${new Date().getFullYear()} Powered by the Subspace Network`
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
