import ParachainTable from "components/ParachainTable";
import NavBar from "components/NavBar";
import Footer from "components/Footer";
import { ApiPromiseContextProvider } from "context";

const MainLayout = () => {
  return (
    <>
      <NavBar/>

      <ApiPromiseContextProvider>
        <ParachainTable />
      </ApiPromiseContextProvider>

      <Footer/>
    </>
  );
};

export default MainLayout;
