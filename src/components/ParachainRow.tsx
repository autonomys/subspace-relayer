import React from "react";
import { Badge, Media, UncontrolledTooltip } from "reactstrap";
import moment from "moment";
import { ParachainProps } from "config/interfaces/Parachain";

const ParachainRow = ({
  chain,
  lastUpdate,
  explorer,
  lastBlockHeight,
  lastBlockHash,
  blockSize,
  subspaceHash,
  web,
}: ParachainProps) => {
  return (
    <tr className="text-capitalizem">
      <th scope="row">
        <Media className="align-items-center">
          <a
            className="avatar rounded-circle"
            onClick={(e) => e.preventDefault()}
            href={web}
            target="_blank"
          >
            <img
              src={
                require("../assets/img/parachains/" +
                  chain.toLocaleLowerCase() +
                  ".png").default
              }
            />
          </a>
          <a href={web} target="_blank" className="h3 pl-3">
            {chain}
          </a>
        </Media>
      </th>
      <td>
        {lastUpdate && (
          <>
            <Badge color="green" className="h1 mr-4 badge-dot badge-lg">
              <i className="bg-success" />
            </Badge>
            <span className="h3">
              {lastUpdate && moment(lastUpdate).format("LLL")}
            </span>
          </>
        )}
      </td>
      <td>
        {explorer && lastBlockHeight && (
          <a target="_blank" href={explorer + "/" + lastBlockHeight}>
            <span className="h3">
              {"# "}
              {lastBlockHeight.toLocaleString()}
            </span>
          </a>
        )}
      </td>
      <td>
        {lastBlockHash && (
          <>
            <UncontrolledTooltip delay={0} placement="top" target={chain}>
              {lastBlockHash}
            </UncontrolledTooltip>
            <h3 data-placement="top" id={chain}>
              <a target="_blank" href={explorer + "/" + lastBlockHash}>
                {lastBlockHash.slice(0, 21) +
                  "..." +
                  lastBlockHash.slice(
                    lastBlockHash.length - 5,
                    lastBlockHash.length
                  )}
              </a>
            </h3>
          </>
        )}
      </td>
      <td>{blockSize && <h3>{blockSize}</h3>}</td>
      <td>
        {subspaceHash && (
          <h3>
            <a
              href={
                process.env.REACT_APP_POLKADOT_APP_SPARTAN + "/" + subspaceHash
              }
            >
              {subspaceHash.slice(0, 12) +
                "..." +
                subspaceHash.substring(
                  subspaceHash.length - 10,
                  subspaceHash.length
                )}
            </a>
          </h3>
        )}
      </td>
    </tr>
  );
};

export default ParachainRow;
