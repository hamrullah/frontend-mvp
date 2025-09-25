import React, { useEffect } from "react";
import Layout from "../Layout";
import BarangList from "../../components/barang/BarangList";
import InventoryList from "../../components/inventory/InventoryList";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { getMe } from "../../features/authSlice";

const Inventorys = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isError } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(getMe());
  }, [dispatch]);

  useEffect(() => {
    if (isError) {
      navigate("/");
    }
  }, [isError, navigate]);
  return (
    <Layout>
      <InventoryList />
    </Layout>
  );
};

export default Inventorys;
