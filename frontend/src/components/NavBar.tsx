import React, { ReactElement, useContext, useEffect, useState } from "react";
import { SystemContext } from "context";
import { Navbar, Nav, NavbarBrand, NavItem, Badge } from "reactstrap";
import { useWindowSize } from "hooks/WindowsSize";

const NavBar: React.FC = (): ReactElement => {
  const { isSystemReady } = useContext(SystemContext);
  const { width } = useWindowSize();
  const [logoSrc, setLogoSrc] = useState<string>("");

  useEffect(() => {
    import(`../assets/img/logo_50x50px.svg`).then(image => {
      setLogoSrc(image.default);
    });
  }, []);

  return (
    <Navbar
      className="navbar-top navbar-dark p-2 pl-4"
      expand="md"
      id="navbar-main"
    >
      <NavbarBrand to="/">
        <img
          width="48"
          alt="..."
          src={logoSrc}
        />
      </NavbarBrand>
      <Nav navbar>
        <NavItem>
          <span className="h1 nav-link-inner--text">Subspace Relayer</span>
        </NavItem>
      </Nav>
      <Nav className="mx-auto">
        {width > 920 && (
          <NavItem>
            <span className="h5 text-gray nav-link-inner--text">
              {"A permanent archival storage service for Polkadot and Kusama."}
            </span>
            <a
              rel="noreferrer"
              href="https://www.parity.io/blog/subspace-archiving-kusama-with-onfinality"
              target="_blank"
              className="h5 text-primary nav-link-inner--text"
            >
              {" Learn more ..."}
            </a>
          </NavItem>
        )}
      </Nav>
      <Nav className="mr-2 ml-4">
        {width > 920 && (
          <NavItem>
            <Badge className="ml-4 badge-dot">
              <i className={isSystemReady ? "bg-success" : "bg-warning"} />
            </Badge>
            <span className="h5 text-gray">
              {isSystemReady ? "Connected" : "Connecting..."}
            </span>
          </NavItem>
        )}
      </Nav>
    </Navbar>
  );
};

export default NavBar;
