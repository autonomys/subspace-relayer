import React, { useContext } from "react";
import { HealthContext } from "context";
import { Navbar, Nav, NavbarBrand, NavItem, Spinner, Badge } from "reactstrap";

const NavBar = () => {
  const { isSyncing, isNodeConnected } = useContext(HealthContext);

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
          <span className=" h1 nav-link-inner--text">Subspace Relayer</span>

          <Badge className="ml-4 badge-dot badge-md nav-link-inner--text">
            <i className={!isSyncing ? "bg-success" : "bg-warning"} />
          </Badge>
          <span className="h5 text-gray">{!isSyncing ? "Connected" : "Connecting..."}</span>
        </NavItem>
      </Nav>
    </Navbar>
  );
};

export default NavBar;
