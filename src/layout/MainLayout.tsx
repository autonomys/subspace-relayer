import ParachainTable from "components/ParachainTable";
import NavBar from "components/NavBar";
import Footer from "components/Footer";
import { ApiPromiseContextProvider, RelayerContextProvider } from "context";

const MainLayout = () => {
  return (
    <>
      <NavBar></NavBar>
      
      <ApiPromiseContextProvider>
        <RelayerContextProvider>
          <ParachainTable />
        </RelayerContextProvider>
      </ApiPromiseContextProvider>

      <Footer></Footer>
    </>
  );
};

export default MainLayout;
