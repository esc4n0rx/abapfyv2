REPORT zrel_antipatterns.

TABLES: vbak.

DATA: gt_vbak TYPE TABLE OF vbak,
      gt_vbap TYPE TABLE OF vbap,
      gt_kna1  TYPE TABLE OF kna1.

SELECT-OPTIONS: s_vkorg FOR vbak-vkorg.

START-OF-SELECTION.

  SELECT * FROM vbak INTO TABLE gt_vbak
    WHERE vkorg IN s_vkorg.

  LOOP AT gt_vbak INTO DATA(ls_vbak).

    SELECT * FROM vbap INTO TABLE gt_vbap
      WHERE vbeln = ls_vbak-vbeln.

    LOOP AT gt_vbap INTO DATA(ls_vbap).
      DATA: lv_name TYPE kna1-name1.

      SELECT SINGLE name1 FROM kna1 INTO lv_name
        WHERE kunnr = ls_vbak-kunnr.

      DATA: lv_achou TYPE abap_bool VALUE abap_false.
      LOOP AT gt_kna1 INTO DATA(ls_kna1).
        IF ls_kna1-kunnr = ls_vbak-kunnr.
          lv_achou = abap_true.
        ENDIF.
      ENDLOOP.

      IF lv_achou = abap_false.
        APPEND VALUE #( kunnr = ls_vbak-kunnr name1 = lv_name ) TO gt_kna1.
      ENDIF.

      DATA(lv_linha) = ls_vbak-vbeln && ls_vbap-posnr && lv_name.
      WRITE: / lv_linha.

    ENDLOOP.

  ENDLOOP.

  DATA: gt_mara TYPE TABLE OF mara.
  SELECT * FROM mara INTO TABLE gt_mara.

  SORT gt_mara BY matnr.
  DELETE ADJACENT DUPLICATES FROM gt_mara COMPARING matnr.

  DATA: lv_temp TYPE string.
  lv_temp = 'processando'.
  WRITE: / lv_temp.
  lv_temp = |{ lines( gt_mara ) }|.
  WRITE: / lv_temp.
