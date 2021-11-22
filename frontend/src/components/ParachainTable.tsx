import { useState } from "react";
import { Card, Container, Row, Table } from "reactstrap";
import { parachains } from "config/AvailableParachain";
import Header from "./Header";
import ParachainRow from "./ParachainRow";
import { ParachainProps } from "config/interfaces/Parachain";

const ParachainTable = () => {
  const [parachainsFeed] = useState<ParachainProps[]>([...parachains]);

  return (
    <div>
      <Header />
      <Container className="pl-4 pr-4 pt-4" fluid>
        <Row>
          <div className="col">
            <Card className="shadow">
              <Table size="md" className="align-items-center" responsive>
                <thead className="thead-light">
                  <tr>
                    <th>{"Chains"}</th>
                    <th>{"Last Updated"}</th>
                    <th className="text-left">{"Last Block Hash"}</th>
                    <th className="text-left">{"Last Block Height"}</th>
                    <th>{"Storage"}</th>
                    <th className="text-right">{"BLOCKS ARCHIVED"}</th>
                  </tr>
                </thead>
                <tbody>
                  {parachainsFeed?.map((parachain: ParachainProps) => (
                    <ParachainRow {...parachain} key={parachain.chain} />
                  ))}
                </tbody>
              </Table>
            </Card>
          </div>
        </Row>
      </Container>
    </div>
  );
};

export default ParachainTable;
