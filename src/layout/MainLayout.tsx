import ParachainTable from "components/ParachainTable";
import NavBar from "components/NavBar";
import Footer from "components/Footer";

const MainLayout = () => {
  return (
    <>
      <NavBar></NavBar>
      <ParachainTable />
      <Footer></Footer>
    </>
  );
};

export default MainLayout;
