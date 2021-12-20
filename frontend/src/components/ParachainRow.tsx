import React, { useEffect, useState } from "react";
import { Media, Spinner, UncontrolledTooltip } from "reactstrap";
import { formatDistanceToNow } from "date-fns";
import { ParachainFeed, ParachainProps } from "config/interfaces/Parachain";
import { bytesToSize, explorerLink, prettyHash } from "components/utils";
import { useWindowSize } from "hooks/WindowsSize";

const ParachainRow: React.FC<ParachainProps & ParachainFeed> = ({ subspaceWss, wss, filter, ecosystem, chain, chainName, web, hash, number, size, subspaceHash }) => {
  const { width } = useWindowSize();
  const [count, setCount] = useState<number>(0);
  const [lastUpdate, setLastUpdate] = useState<number>(0);
  const [lastFeedNumber, setlastFeedNumber] = useState<number>();
  const [imageSrc, setImageSrc] = useState<string>("");

  useEffect(() => {
    if (!lastFeedNumber || number > lastFeedNumber) {
      setlastFeedNumber(number);
      setLastUpdate(Date.now);
      setCount(0);
    }
  }, [number, lastFeedNumber]);

  useEffect(() => {
    const timer = setInterval(() => setCount(count + 1), 1000);
    return () => clearInterval(timer);
  }, [count]);

  useEffect(() => {
    import(`../assets/img/parachains/${chain}.png`).then(image => {
      setImageSrc(image.default);
    });
  }, [chain]);

  if (filter && filter === 1 && ecosystem !== "kusama") return null;
  else if (filter && filter === 2 && ecosystem !== "polkadot") return null;
  return (
    <tr>
      <th scope="row" className="col-md-2">
        {width < 920 && (
          <UncontrolledTooltip delay={0} placement="top" target={chain + "logo"}>
            {chainName}
          </UncontrolledTooltip>
        )}
        <Media className="align-items-center">
          <a rel="noreferrer" className="avatar rounded-circle" href={web} target="_blank">
            <span data-placement="top" id={chain + "logo"}>
              <img alt="parachain logo" src={imageSrc} />
            </span>
          </a>
          {width > 920 && (
            <a href={web} rel="noreferrer" target="_blank" className="h3 pl-3">
              {chainName}
            </a>
          )}
        </Media>
      </th>
      <td className="col-md-2 text-md">
        {lastFeedNumber && number ? (
          <>
            <Spinner
              className={"mr-2 " + (count < 60 ? "bg-success" : count >= 60 && count < 120 ? "bg-yellow" : "bg-red")}
              type="grow"
              size={"sm"}
            />
            <span>{formatDistanceToNow(lastUpdate)}</span>
          </>
        ) : (
          <>
            <Spinner className="mr-2" type="grow" size={"sm"} />
            <span>Listening pending feeds ...</span>
          </>
        )}
      </td>
      <td className="col-md-3 text-lg text-left">
        <UncontrolledTooltip delay={0} placement="top" target={chain + "hash"}>
          {hash}
        </UncontrolledTooltip>
        <span data-placement="top" id={chain + "hash"}>
          <a rel="noreferrer" target="_blank" href={explorerLink(hash, wss)}>
            {width > 920 ? prettyHash(hash, 12, 8) : prettyHash(hash, 6, 4)}
          </a>
        </span>
      </td>
      <td className="col-md-2 text-lg">
        <a rel="noreferrer" target="_blank" href={explorerLink(number, wss)}>
          <span>
            {"# "}
            {number.toLocaleString()}
          </span>
        </a>
      </td>
      <td className="col-md-1 text-left">{size > 0 && <h2>{bytesToSize(size)}</h2>}</td>
      <td className="col-md-2 text-lg text-right">
        {subspaceHash ? (
          <>
            <UncontrolledTooltip delay={0} placement="top" target={chain + "subspaceHash"}>
              {subspaceHash}
            </UncontrolledTooltip>
            <span data-placement="top" id={chain + "subspaceHash"}>
              <a rel="noreferrer" target="_blank" href={explorerLink(subspaceHash, subspaceWss)}>
                {width > 920 ? prettyHash(subspaceHash, 12, 8) : prettyHash(subspaceHash, 6, 4)}
              </a>
            </span>
          </>
        ) : (
          <>
            <UncontrolledTooltip delay={0} placement="top" target={chain + "awaitNextArchive"}>
              {"Awaiting for the next blocks archived for this chain ..."}
            </UncontrolledTooltip>
            <span data-placement="top" id={chain + "awaitNextArchive"}>
              <Spinner className="ml-2" size={"sm"}></Spinner>
            </span>
          </>
        )}
      </td>
    </tr>
  );
};

export default ParachainRow;
