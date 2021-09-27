import React from 'react';
import Header from 'components/Header';
import ParachainTable from 'components/ParachainTable';
import { Card, CardBody, CardSubtitle, CardText, Col, Container, Row } from 'reactstrap';


const MainLayout = () => {
	return (
		<>
			<Header />
			<Container className='mt-4'>
				<Row className='text-center'>
					<Col md='3'>
						<Card>
							<CardBody>
								<CardText>Chains</CardText>
								<CardSubtitle tag='h1' className='mb-2 text-muted'>
									12
								</CardSubtitle>
							</CardBody>
						</Card>
					</Col>
					<Col md='3'>
						<Card>
							<CardBody>
								<CardText>Blocks</CardText>
								<CardSubtitle tag='h1' className='mb-2 text-muted'>
									651452
								</CardSubtitle>
							</CardBody>
						</Card>
					</Col>
					<Col md='3'>
						<Card>
							<CardBody>
								<CardText>Storage</CardText>
								<CardSubtitle tag='h1' className='mb-2 text-muted'>
									2.2 GB
								</CardSubtitle>
							</CardBody>
						</Card>
					</Col>
					<Col md='3'>
						<Card>
							<CardBody>
								<CardText>Version</CardText>
								<CardSubtitle tag='h1' className='mb-2 text-muted'>
									0.0.1
								</CardSubtitle>
							</CardBody>
						</Card>
					</Col>
					<ParachainTable />
				</Row>
			</Container>
		</>
	);
};

export default MainLayout;
