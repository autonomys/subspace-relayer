import React, { useEffect, useState } from "react";
import { Badge, Media, Spinner, UncontrolledTooltip } from "reactstrap";
import moment from "moment";
import { ParachainProps } from "config/interfaces/Parachain";

const ParachainRow = ({
  chain,
  chainName,
  lastUpdate,
  explorer,
  lastBlockHeight,
  lastBlockHash,
  blockSize,
  subspaceHash,
  web,
}: ParachainProps) => {
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    const timer = setInterval(() => setCount(count + 1), 1000);
    return () => clearInterval(timer);
  }, [count]);

  useEffect(() => {
    setCount(0);
  }, [lastUpdate]);

  return (
    <tr className="text-capitalizem">
      <th scope="row">
        <Media className="align-items-center">
          <a
            rel="noreferrer"
            className="avatar rounded-circle"
            href={web}
            target="_blank"
          >
            <img
              alt="parachain logo"
              src={
                require("../assets/img/parachains/" + chain + ".png").default
              }
            />
          </a>
          <a href={web} rel="noreferrer" target="_blank" className="h3 pl-3">
            {chainName}
          </a>
        </Media>
      </th>
      <td>
        {lastUpdate ? (
          <>
            <Badge className="h1 mr-4 badge-dot badge-lg">
              <i
                className={
                  count < 60
                    ? "bg-success"
                    : count >= 60 && count < 120
                    ? "bg-yellow"
                    : "bg-red"
                }
              />
            </Badge>
            <span className="h3">{moment(lastUpdate).calendar()}</span>
          </>
        ) : (
          <>
            <Spinner
              className="mr-4"
              color="text-primary"
              size={"sm"}
            ></Spinner>
            <span className="h5 text-gray">Listening pending feeds ...</span>
          </>
        )}
      </td>
      <td>
        {lastBlockHeight && (
          <a
            rel="noreferrer"
            target="_blank"
            href={explorer + "/" + lastBlockHeight}
          >
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
              <a
                rel="noreferrer"
                target="_blank"
                href={explorer + "/" + lastBlockHash}
              >
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
              target="_blank"
              rel="noreferrer"
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
