import React, { ReactElement } from 'react';
import { Card, CardBody, CardTitle, Row, Col, Spinner } from "reactstrap";

const CardHeader: React.FC<{ title: string; content: string, md: string }> = ({ title,
  content,
  md,
}): ReactElement => {
  return (
    <Col md={md}>
      <Card className="card-stats mb-4 mb-xl-0">
        <CardBody>
          <Row>
            <div className="col">
              <CardTitle className="text-uppercase mb-0">
                <h2 className="text-truncate">{title}</h2>
                <h2 className="font-weight-bold text-primary">
                  {content.length > 0 ? (
                    content
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
  );
};

export default CardHeader;
