import { useContext, useEffect, useState } from "react";
import { Media, Spinner, UncontrolledTooltip } from "reactstrap";
import { formatDistanceToNow } from "date-fns";
import { Feed, ParachainProps } from "config/interfaces/Parachain";
import { bytesToSize, prettyHash } from "components/utils";
import { ApiPromiseContext, RelayerContext } from "context";
import { useWindowSize } from "hooks/WindowsSize";

const ParachainRow = ({
  feedId,
  chain,
  chainName,
  web,
  explorer,
}: ParachainProps) => {
  const { api, isApiReady } = useContext(ApiPromiseContext);
  const [count, setCount] = useState<number>(0);
  const [lastFeed, setLastFeed] = useState<Feed>();
  const [lastUpdate, setLastUpdate] = useState<any>(0);
  const { feedsTotals } = useContext(RelayerContext);
  const { width } = useWindowSize();

  useEffect(() => {
    if (!isApiReady) return;
    api.query.feeds.metadata(feedId, (metadata: any) => {
      if (!metadata.isEmpty) {
        const feed = JSON.parse(metadata.toHuman()?.toString() || "");
        setLastFeed(feed);
        setLastUpdate(Date.now);
      }
    });
  }, [isApiReady, api, feedId]);

  useEffect(() => {
    const timer = setInterval(() => setCount(count + 1), 1000);
    return () => clearInterval(timer);
  }, [count]);

  useEffect(() => {
    setCount(0);
  }, [lastFeed]);

  return (
    <tr>
      <th scope="row" className="col-md-2">
        {width < 920 && (
          <UncontrolledTooltip
            delay={0}
            placement="top"
            target={chain + feedId.toString()}
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
            <span data-placement="top" id={chain + feedId.toString()}>
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
        {lastFeed ? (
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
        {lastFeed && (
          <>
            <UncontrolledTooltip delay={0} placement="top" target={chain}>
              {lastFeed.hash}
            </UncontrolledTooltip>
            <span data-placement="top" id={chain}>
              <a
                rel="noreferrer"
                target="_blank"
                href={explorer + "/" + lastFeed.hash}
              >
                {width > 920
                  ? prettyHash(lastFeed.hash, 16, 10)
                  : prettyHash(lastFeed.hash, 6, 4)}
              </a>
            </span>
          </>
        )}
      </td>
      <td className="col-md-2 text-lg">
        {lastFeed && (
          <a
            rel="noreferrer"
            target="_blank"
            href={explorer + "/" + lastFeed.number}
          >
            <span>
              {"# "}
              {lastFeed.number.toLocaleString()}
            </span>
          </a>
        )}
      </td>
      <td className="col-md-1 text-lg text-left">
        {lastFeed && feedsTotals[feedId] && (
          <span>{bytesToSize(feedsTotals[feedId].size_.toNumber())}</span>
        )}
      </td>
      <td className="col-md-1 text-lg text-left">
        {lastFeed && feedsTotals[feedId] && (
          <span>{feedsTotals[feedId].count.toNumber().toLocaleString()}</span>
        )}
      </td>
    </tr>
  );
};

export default ParachainRow;
