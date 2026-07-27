REPORT zrel_pedidos_abertos.

TABLES: ekko.

SELECT-OPTIONS: s_ekorg FOR ekko-ekorg OBLIGATORY,
                s_lifnr FOR ekko-lifnr,
                s_bedat FOR ekko-bedat OBLIGATORY.

DATA: gt_ekko TYPE TABLE OF ekko,
      gt_ekpo TYPE TABLE OF ekpo,
      gt_saida TYPE TABLE OF ty_saida.

TYPES: BEGIN OF ty_saida,
         ebeln TYPE ekko-ebeln,
         ebelp TYPE ekpo-ebelp,
         lifnr TYPE ekko-lifnr,
         name1 TYPE lfa1-name1,
         matnr TYPE ekpo-matnr,
         menge TYPE ekpo-menge,
       END OF ty_saida.

START-OF-SELECTION.

  SELECT * FROM ekko INTO TABLE gt_ekko
    WHERE ekorg IN s_ekorg
      AND lifnr IN s_lifnr
      AND bedat IN s_bedat.

  LOOP AT gt_ekko INTO DATA(ls_ekko).
    SELECT * FROM ekpo INTO TABLE gt_ekpo
      WHERE ebeln = ls_ekko-ebeln.

    LOOP AT gt_ekpo INTO DATA(ls_ekpo).
      DATA(ls_saida) = VALUE ty_saida(
        ebeln = ls_ekko-ebeln
        ebelp = ls_ekpo-ebelp
        lifnr = ls_ekko-lifnr
        matnr = ls_ekpo-matnr
        menge = ls_ekpo-menge ).

      SELECT SINGLE name1 FROM lfa1 INTO ls_saida-name1
        WHERE lifnr = ls_ekko-lifnr.

      APPEND ls_saida TO gt_saida.
    ENDLOOP.
  ENDLOOP.

  LOOP AT gt_saida INTO DATA(ls_out).
    WRITE: / ls_out-ebeln, ls_out-ebelp, ls_out-lifnr,
             ls_out-name1, ls_out-matnr, ls_out-menge.
  ENDLOOP.
