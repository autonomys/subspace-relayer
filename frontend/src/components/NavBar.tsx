import { useContext } from "react";
import { HealthContext } from "context";
import { Navbar, Nav, NavbarBrand, NavItem, Badge } from "reactstrap";
import { useWindowSize } from "hooks/WindowsSize";

const NavBar = () => {
  const { isSyncing } = useContext(HealthContext);
  const { width } = useWindowSize();
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
          src={require("../assets/img/logo_50x50px.svg").default}
        />
      </NavbarBrand>
      <Nav navbar>
        <NavItem>
          <span className="h1 nav-link-inner--text">Subspace Relayer</span>
        </NavItem>
      </Nav>
      <Nav className="ml-auto">
        <NavItem>
          <span className="h5 text-gray nav-link-inner--text">
            {"A permanent archival storage service for Polkadot and Kusama."}
          </span>
        </NavItem>
        {width > 920 && (
          <NavItem>
            <Badge className="ml-4 badge-dot">
              <i className={!isSyncing ? "bg-success" : "bg-warning"} />
            </Badge>
            <span className="h5 text-gray">
              {!isSyncing ? "Connected" : "Connecting..."}
            </span>
          </NavItem>
        )}
      </Nav>
    </Navbar>
  );
};

export default NavBar;
