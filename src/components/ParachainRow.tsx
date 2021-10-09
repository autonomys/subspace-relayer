import React, { useContext, useEffect, useState } from "react";
import { Badge, Media, Spinner, UncontrolledTooltip } from "reactstrap";
import { formatDistance } from "date-fns";
import { ParachainProps } from "config/interfaces/Parachain";
import { RelayerContext } from "context";
import { bytesToSize, prettyHash } from "components/utils";

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
  feedId,
}: ParachainProps) => {
  const [count, setCount] = useState<number>(0);
  const { feedsTotals } = useContext(RelayerContext);

  useEffect(() => {
    const timer = setInterval(() => setCount(count + 1), 1000);
    return () => clearInterval(timer);
  }, [count]);

  useEffect(() => {
    setCount(0);
  }, [lastUpdate]);

  return (
    <tr>
      <th scope="row" className="col-md-1">
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
      <td className="col-md-1 text-md">
        {lastUpdate ? (
          <>
            <Badge className="mr-2 badge-dot badge-lg">
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
            <span>{formatDistance(lastUpdate, Date.now())}</span>
          </>
        ) : (
          <>
            <Spinner
              className="mr-4"
              color="text-primary"
              size={"sm"}
            ></Spinner>
            <span>Listening pending feeds ...</span>
          </>
        )}
      </td>
      <td className="col-md-3 text-lg text-right">
        {lastBlockHash && (
          <>
            <UncontrolledTooltip delay={0} placement="top" target={chain}>
              {lastBlockHash}
            </UncontrolledTooltip>
            <span data-placement="top" id={chain}>
              <a
                rel="noreferrer"
                target="_blank"
                href={explorer + "/" + lastBlockHash}
              >
                {prettyHash(lastBlockHash)}
              </a>
            </span>
          </>
        )}
      </td>
      <td className="col-md-1 text-lg">
        {lastBlockHeight && (
          <a
            rel="noreferrer"
            target="_blank"
            href={explorer + "/" + lastBlockHeight}
          >
            <span>
              {"# "}
              {lastBlockHeight.toLocaleString()}
            </span>
          </a>
        )}
      </td>
      <td className="col-md-1 text-lg">{blockSize && <span>{blockSize}</span>}</td>
      <td className="col-md-3 text-lg text-right">
        {subspaceHash && (
          <span>
            <a
              target="_blank"
              rel="noreferrer"
              href={
                process.env.REACT_APP_POLKADOT_APP_SUBSPACE + "/" + subspaceHash
              }
            >
              {prettyHash(subspaceHash)}
            </a>
          </span>
        )}
      </td>
      <td className="col-md-2 text-md text-right">
        {feedsTotals && feedsTotals[feedId] && (
          <span>
            {"Blocks"} {feedsTotals[feedId].objects.toNumber()}
            {" | "}
            {bytesToSize(feedsTotals[feedId].size_.toNumber())}
          </span>
        )}{" "}
      </td>
    </tr>
  );
};

export default ParachainRow;
