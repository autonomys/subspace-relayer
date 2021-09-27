import React from 'react';
import { Navbar, Nav, NavItem, NavLink } from 'reactstrap';

const Header = () => {
	return (
		<Navbar color='light' light expand='md'>
			<Nav className='mr-auto' navbar>
				<NavItem>
					<NavLink href='/components/'>Subspace Relayer</NavLink>
				</NavItem>
			</Nav>
		</Navbar>
	);
};

export default Header;
