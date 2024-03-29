const commonHelper = require("../helper/common");
const {
  selectAllDetailSelling,
  selectAllSellingById,
  selectAllSelling,
  insertSelling,
  insertDetailSelling,
  deleteSelling,
  countAllSelling,
  countAllDetailSelling,
  searchByIdAndDate,
} = require("../models/selling");

const sellingController = {
  listDetailSelling: async (req, res) => {
    try {
      // Mengambil query dan memberi nilai default
      const page = req.query.page || 1;
      const limit = req.query.limit || 10;
      const offset = (page - 1) * limit;
      const orderby = req.query.orderby || "detail_penjualan.ID";
      const order = req.query.order || "DESC";

      //Menjalankan fungsi select all dan membuat pagination
      const result = await selectAllDetailSelling(
        limit,
        offset,
        orderby,
        order
      );
      const [detailSellingCount] = await countAllDetailSelling();
      const totalData = detailSellingCount.count;
      const totalPage = Math.ceil(totalData / limit);
      const pagination = {
        currentPage: parseInt(page),
        limit: parseInt(limit),
        totalPage: totalPage,
        totalData: totalData,
      };

      //Menampilkan hasil atau error
      if (result.length === 0)
        return commonHelper.response(res, result, 404, "Data not found!");
      return commonHelper.response(
        res,
        result,
        200,
        "Get data success!",
        pagination
      );
    } catch (error) {
      console.log(error);
      if (
        error.code === "ER_SP_UNDECLARED_VAR" ||
        error.code === "ER_BAD_FIELD_ERROR"
      ) {
        commonHelper.response(
          res,
          error,
          400,
          "Undeclared variable! Check your query params!"
        );
      } else {
        commonHelper.response(res, null, 500);
      }
    }
  },

  listSelling: async (req, res) => {
    try {
      // Mengambil query dan memberi nilai default
      const page = req.query.page || 1;
      const limit = req.query.limit || 10;
      const offset = (page - 1) * limit;
      const orderby = req.query.orderby || "penjualan.ID";
      const order = req.query.order || "DESC";
      const id = req.query.id || "";
      const startDate = req.query.startDate || "";
      const endDate = req.query.endDate || "";

      //Menentukan error jika endDate lebih dahulu dari startDate
      if(startDate && endDate){
        const dateDif = new Date(endDate) - new Date(startDate);
        if(dateDif < 0){
          return commonHelper.response(res, [], 400, "startDate must be earlier than or same as endDate")
        }
      }

      //Menjalankan fungsi select all dan membuat pagination
      const result = await selectAllSelling(
        limit,
        offset,
        orderby,
        order,
        id,
        startDate,
        endDate,
        searchByIdAndDate
      );
      const [sellingCount] = await countAllSelling(
        id,
        startDate,
        endDate,
        searchByIdAndDate
      );
      const totalData = sellingCount.count;
      const totalPage = Math.ceil(totalData / limit);
      
      let pagination = {};
      if (!id) {
        pagination = {
          currentPage: parseInt(page),
          limit: parseInt(limit),
          totalPage: totalPage,
          totalData: totalData,
        };
      }

      //Menampilkan hasil atau error
      if (result.length === 0)
        return commonHelper.response(res, result, 404, "Data not found!");
      return commonHelper.response(
        res,
        result,
        200,
        "Get data success!",
        pagination
      );
    } catch (error) {
      console.log(error);
      if (
        error.code === "ER_SP_UNDECLARED_VAR" ||
        error.code === "ER_BAD_FIELD_ERROR" ||
        error.code === "ER_PARSE_ERROR"
      ) {
        commonHelper.response(
          res,
          error,
          400,
          "Failed to get data! Check your query params!"
        );
      } else {
        commonHelper.response(res, null, 500);
      }
    }
  },

  listSellingById: async (req, res) => {
    try {
      // Mengambil query dan memberi nilai default
      const id = Number(req.params.id);
      const orderby = req.query.orderby || "detail_penjualan.ID";
      const order = req.query.order || "DESC";

      //Menjalankan fungsi select all
      const result = await selectAllSellingById(id, orderby, order);

      //Menampilkan hasil atau error
      if (result.length === 0)
        return commonHelper.response(
          res,
          result,
          404,
          "Data not found! Check your ID params!"
        );

      return commonHelper.response(res, result, 200, "Get data success!");
    } catch (error) {
      console.log(error);
      if (
        error.code === "ER_SP_UNDECLARED_VAR" ||
        error.code === "ER_BAD_FIELD_ERROR"
      ) {
        commonHelper.response(
          res,
          error,
          400,
          "Failed to get data! Check your query params!"
        );
      } else {
        commonHelper.response(res, null, 500);
      }
    }
  },

  insertSellingAndDetail: async (req, res) => {
    // Mengambil input dari req.body dan membuat variabel untuk result (hasil)
    const {
      sellingId,
      detailSellingId,
      detailMedicines,
      transactionDate,
      userId,
    } = req.body;
    const customer = req.body.customer || "anonim";
    let resultSelling = {};
    let resultDetailSelling = {};
    let result = {};
    let errorInput = [];

    try {
      // Verifikasi kelengkapan data untuk diinsert ke tabel
      if (!detailSellingId) errorInput.push("detailSellingID not Found!");
      if (!sellingId) errorInput.push("sellingID not Found!");
      if (!detailMedicines) errorInput.push("detailMedicines not Found!");
      if (!transactionDate) errorInput.push("transactionDate not Found!");
      if (!userId) errorInput.push("userId not Found!");
      if (!customer) errorInput.push("customer not Found!");

      if (errorInput.length > 0)
        return commonHelper.response(
          res,
          errorInput,
          400,
          "Incomplete input data! Check your input! (Check data for details!)"
        );

      // Menjalankan fungsi untuk melakukan insert di tabel penjualan dan detail_penjualan
      resultSelling = await insertSelling(
        sellingId,
        customer,
        transactionDate,
        userId
      );
      if (resultSelling) {
        result = { ...result, sellingInsertedRows: resultSelling.affectedRows };
      }
      console.log(resultSelling);
      resultDetailSelling = await insertDetailSelling(
        detailSellingId,
        sellingId,
        detailMedicines
      );
      if (resultDetailSelling) {
        result = {
          ...result,
          detailSellingInsertedRows:
            resultDetailSelling[resultDetailSelling.length - 1].affectedRows,
        };
      }

      // Menampilkan error atau pesan sukses
      return commonHelper.response(res, result, 200, "Insert data successful!");
    } catch (error) {
      console.log(error);
      // Apabila insert ke tabel penjualan berhasil namun insert ke tabel detail_penjualan gagal, maka hapus hasil insert tabel penjualan
      if (resultSelling.length > 0) {
        deleteSelling(sellingId);
      }
      if (error.code === "ER_DUP_ENTRY")
        return commonHelper.response(
          res,
          error,
          400,
          "Bad request! Check your input! (Check data for details!)"
        );
      return res.send(error);
    }
  },

  // updateSellingAndDetail: async (req, res) => {
  //   try {
  //   } catch (error) {}
  // },
};

module.exports = sellingController;
