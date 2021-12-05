import { useContext, useEffect, useState } from "react";
import { Media, Spinner, UncontrolledTooltip } from "reactstrap";
import { formatDistanceToNow } from "date-fns";
import { ParachainFeed, ParachainProps } from "config/interfaces/Parachain";
import { bytesToSize, explorerLink, prettyHash } from "components/utils";
import { RelayerContext } from "context";
import { useWindowSize } from "hooks/WindowsSize";

const ParachainRow = ({
  wss,
  feedId,
  chain,
  chainName,
  web,
  subspaceWss,
  ecosystem,
  filter,
}: ParachainProps) => {
  const { width } = useWindowSize();
  const [count, setCount] = useState<number>(0);
  const [lastUpdate, setLastUpdate] = useState<number>(0);
  const [lastFeed, setlastFeed] = useState<ParachainFeed | null>(null);
  const { parachainFeeds } = useContext(RelayerContext);

  useEffect(() => {
    if (!parachainFeeds[feedId]) return;

    if (!lastFeed || parachainFeeds[feedId].number > lastFeed.number) {
      setlastFeed(parachainFeeds[feedId]);
      setLastUpdate(Date.now);
      setCount(0);
    }
  }, [parachainFeeds, lastFeed, feedId]);

  useEffect(() => {
    const timer = setInterval(() => setCount(count + 1), 1000);
    return () => clearInterval(timer);
  }, [count]);

  if (filter && filter === 1 && ecosystem !== "kusama") return <></>;
  else if (filter && filter === 2 && ecosystem !== "polkadot") return <></>;

  return (
    <tr>
      <th scope="row" className="col-md-2">
        {width < 920 && (
          <UncontrolledTooltip
            delay={0}
            placement="top"
            target={chain + "logo"}
          >
            {chainName}
          </UncontrolledTooltip>
        )}
        <Media className="align-items-center">
          <a
            rel="noreferrer"
            className="avatar rounded-circle"
            href={web}
            target="_blank"
          >
            <span data-placement="top" id={chain + "logo"}>
              <img
                alt="parachain logo"
                src={
                  require("../assets/img/parachains/" + chain + ".png").default
                }
              />
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
        {lastFeed && lastFeed.number && lastFeed.hash ? (
          <>
            <Spinner
              className={
                "mr-2 " +
                (count < 60
                  ? "bg-success"
                  : count >= 60 && count < 120
                  ? "bg-yellow"
                  : "bg-red")
              }
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
        {lastFeed && lastFeed.hash && (
          <>
            <UncontrolledTooltip
              delay={0}
              placement="top"
              target={chain + "hash"}
            >
              {lastFeed.hash}
            </UncontrolledTooltip>
            <span data-placement="top" id={chain + "hash"}>
              <a
                rel="noreferrer"
                target="_blank"
                href={explorerLink(lastFeed.hash, wss)}
              >
                {width > 920
                  ? prettyHash(lastFeed.hash, 12, 8)
                  : prettyHash(lastFeed.hash, 6, 4)}
              </a>
            </span>
          </>
        )}
      </td>
      <td className="col-md-2 text-lg">
        {lastFeed && lastFeed.number && (
          <a
            rel="noreferrer"
            target="_blank"
            href={explorerLink(lastFeed.number, wss)}
          >
            <span>
              {"# "}
              {lastFeed.number.toLocaleString()}
            </span>
          </a>
        )}
      </td>
      <td className="col-md-1 text-left">
        {lastFeed && lastFeed.size > 0 && (
          <h2>{bytesToSize(lastFeed.size)}</h2>
        )}
      </td>
      <td className="col-md-2 text-lg text-right">
        {lastFeed && lastFeed.subspaceHash ? (
          <>
            <UncontrolledTooltip
              delay={0}
              placement="top"
              target={chain + "subspaceHash"}
            >
              {lastFeed.subspaceHash}
            </UncontrolledTooltip>
            <span data-placement="top" id={chain + "subspaceHash"}>
              <a
                rel="noreferrer"
                target="_blank"
                href={explorerLink(lastFeed.subspaceHash, subspaceWss)}
              >
                {width > 920
                  ? prettyHash(lastFeed.subspaceHash, 12, 8)
                  : prettyHash(lastFeed.subspaceHash, 6, 4)}
              </a>
            </span>
          </>
        ) : (
          <>
            <UncontrolledTooltip
              delay={0}
              placement="top"
              target={chain + "awaitNextArchive"}
            >
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
