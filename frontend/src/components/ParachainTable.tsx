import { useState } from "react";
import { Badge, Card, Container, Table } from "reactstrap";
import { allChains } from "config/AvailableParachain";
import Header from "./Header";
import ParachainRow from "./ParachainRow";
import { ParachainProps } from "config/interfaces/Parachain";

const ParachainTable = () => {
  const [parachainProps] = useState<ParachainProps[]>([...allChains]);
  const [filter, setFilter] = useState<number>(0);

  const getFilterColor = (filterIndex: number): string => {
    if (filterIndex === filter) return "badge-lg badge-cursor text-white";
    else return "badge-lg badge-cursor text-gray";
  };

  return (
    <div>
      <Header />
      <Container className="pt-2 ml-4">
        <Badge
          color={filter === 0 ? " bg-primary" : ""}
          onClick={() => setFilter(0)}
          className={getFilterColor(0)}
        >
          {"ALL CHAINS"}
        </Badge>
        <Badge
          color={filter === 1 ? " bg-gray-dark" : ""}
          onClick={() => setFilter(1)}
          className={getFilterColor(1)}
        >
          {"KUSAMA"}
        </Badge>
        <Badge
          color={filter === 2 ? " badge-pink" : ""}
          onClick={() => setFilter(2)}
          className={getFilterColor(2)}
        >
          {"POLKADOT"}
        </Badge>
      </Container>
      <Container className="pl-4 pr-4 pt-2" fluid>
        <Card className="shadow">
          <Table size="md" className="align-items-center" responsive>
            <thead className="thead-light">
              <tr>
                <th>{"Chains"}</th>
                <th>{"Last Updated"}</th>
                <th className="text-left">{"Last Block Hash"}</th>
                <th className="text-left">{"Last Block Height"}</th>
                <th>{"Storage"}</th>
                <th className="text-right">{"Subspace Hash"}</th>
              </tr>
            </thead>
            <tbody>
              {parachainProps.map((chain) => (
                <ParachainRow key={chain.feedId} {...chain} filter={filter} />
              ))}
            </tbody>
          </Table>
        </Card>
      </Container>
    </div>
  );
};

export default ParachainTable;
