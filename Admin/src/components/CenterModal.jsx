import React, { useState, useEffect, useContext, useMemo } from "react";
import { AuthContext } from "../contexts/AuthContext";
import { ROLES } from "../constants/roles";
import { createCenterGQL, updateCenterGQL } from "../apiV2/center_service/graphql/center.api";
import { uploadImageREST } from "../apiV2/center_service/rest/center.api";
import LoadingSpinner from "../components/LoadingSpinner";
import { MdClose, MdCloudUpload, MdAutoFixHigh } from "react-icons/md";

// --- Helper: Image Upload Box ---
const ImageUploadBox = ({ label, images, onAdd, onRemove, isMultiple = false }) => (
    <div style={{ marginBottom: '15px' }}>
        <label style={{ fontWeight: '600', display: 'block', marginBottom: '8px' }}>{label}</label>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {images.map((img, idx) => (
                <div key={idx} style={{ position: 'relative', width: '100px', height: '100px' }}>
                    <img
                        src={img.preview || img.url}
                        alt="Preview"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px', border: '1px solid #ddd' }}
                    />
                    <button type="button" onClick={() => onRemove(idx)} style={{ position: 'absolute', top: -5, right: -5, background: 'red', color: 'white', borderRadius: '50%', border: 'none', width: '20px', height: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                </div>
            ))}

            {(isMultiple || images.length === 0) && (
                <label style={{
                    width: '100px', height: '100px', border: '2px dashed #ccc', borderRadius: '8px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: '#666', background: '#FAFAFA'
                }}>
                    <MdCloudUpload size={24} />
                    <span style={{ fontSize: '0.7rem', marginTop: '4px' }}>{isMultiple ? 'Thêm ảnh' : 'Chọn ảnh'}</span>
                    <input
                        type="file" accept="image/*" multiple={isMultiple}
                        onChange={(e) => onAdd(e.target.files)} style={{ display: 'none' }}
                    />
                </label>
            )}
        </div>
    </div>
);

// --- Helper Component: TimeSlot Row ---
const TimeSlotRow = ({ slot, onChange, onRemove }) => (
    <div style={{ display: 'flex', gap: '5px', marginBottom: '5px', alignItems: 'center' }}>
        <input type="time" value={slot.startTime || ''} onChange={e => onChange('startTime', e.target.value)} style={{ padding: '5px', borderRadius: '4px', border: '1px solid #ddd' }} />
        <span>-</span>
        <input type="time" value={slot.endTime || ''} onChange={e => onChange('endTime', e.target.value)} style={{ padding: '5px', borderRadius: '4px', border: '1px solid #ddd' }} />
        <input type="number" placeholder="Giá" value={slot.price || ''} onChange={e => onChange('price', parseFloat(e.target.value))} style={{ width: '80px', padding: '5px', borderRadius: '4px', border: '1px solid #ddd' }} />
        <button type="button" onClick={onRemove} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}>X</button>
    </div>
);

// =================================================================================
// --- MAIN COMPONENT: CenterModal ---
// =================================================================================
const CenterModal = ({ center, isOpen, onClose, onSave, isCreating, centerManagers, allCenters }) => {
    const defaultPricing = { weekday: [], weekend: [] };
    const { admin } = useContext(AuthContext);
    const [formData, setFormData] = useState({});
    const [logoImage, setLogoImage] = useState([]);
    const [galleryImages, setGalleryImages] = useState([]);
    const [isUploading, setIsUploading] = useState(false);

    // 1. Logic lọc Managers
    const availableManagers = useMemo(() => {
        if (!centerManagers || admin?.role !== ROLES.SUPER_ADMIN) return [];
        const currentCenterId = center?.centerId;
        const currentManagerId = center?.centerManagerId;
        const assignedToOthersIds = new Set(allCenters
            .filter(c => c.centerId !== currentCenterId && c.centerManagerId)
            .map(c => c.centerManagerId)
        );

        return centerManagers
            .map(m => {
                const isCurrentlyAssigned = m.userId === currentManagerId;
                const isAssignedElsewhere = assignedToOthersIds.has(m.userId) && !isCurrentlyAssigned;
                let statusText = '';
                if (!m.isActive) statusText = ' (BỊ KHÓA)';
                else if (isAssignedElsewhere) statusText = ' (Đã gán cho nơi khác)';
                else statusText = ' (Active)';

                return { ...m, isDisabled: isAssignedElsewhere, statusText: statusText };
            })
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [centerManagers, center, allCenters, admin]);

    // 2. Effect Load Data
    useEffect(() => {
        if (isOpen) {
            if (center && !isCreating) {
                setFormData({
                    ...center,
                    pricing: center.pricing || defaultPricing,
                    facilitiesString: center.facilities ? center.facilities.join(', ') : '',
                    centerManagerId: center.centerManagerId || ''
                });
                if (center.logoUrl && center.logo_file_id) {
                    setLogoImage([{ url: center.logoUrl, id: center.logo_file_id, file: null }]);
                } else setLogoImage([]);
                if (center.imageUrlList && center.image_file_ids) {
                    const mapped = center.imageUrlList.map((url, i) => ({
                        url, id: center.image_file_ids[i], file: null
                    }));
                    setGalleryImages(mapped.filter(item => item.id));
                } else setGalleryImages([]);
            } else {
                setFormData({
                    name: '', address: '', phone: '', description: '',
                    totalCourts: 0, googleMapUrl: '', isActive: true,
                    centerManagerId: '', facilitiesString: '', pricing: defaultPricing
                });
                setLogoImage([]);
                setGalleryImages([]);
            }
        }
    }, [center, isOpen, isCreating, centerManagers]);

    // 3. UX: Đóng bằng phím ESC
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    // 4. Logic Smart Embed
    const handleAutoGenerateMap = () => {
        if (!formData.address || formData.address.trim() === "") {
            alert("Vui lòng nhập ô 'Địa chỉ' ở trên trước!");
            return;
        }
        const encodedAddress = encodeURIComponent(formData.address);
        const autoUrl = `https://maps.google.com/maps?q=${encodedAddress}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
        setFormData(prev => ({ ...prev, googleMapUrl: autoUrl }));
    };

    const handleMapUrlChange = (e) => {
        let val = e.target.value;
        const iframeSrcRegex = /src="([^"]+)"/;
        const match = val.match(iframeSrcRegex);
        if (match && match[1]) val = match[1];
        setFormData(prev => ({ ...prev, googleMapUrl: val }));
    };

    // 5. Form Handlers
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };
    const handlePricingChange = (type, index, field, value) => {
        const newPricing = { ...formData.pricing };
        newPricing[type] = [...newPricing[type]];
        newPricing[type][index] = { ...newPricing[type][index], [field]: value };
        setFormData(prev => ({ ...prev, pricing: newPricing }));
    };
    const addTimeSlot = (type) => {
        const newPricing = { ...formData.pricing };
        newPricing[type] = [...(newPricing[type] || []), { startTime: '08:00', endTime: '09:00', price: 50000 }];
        setFormData(prev => ({ ...prev, pricing: newPricing }));
    };
    const removeTimeSlot = (type, index) => {
        const newPricing = { ...formData.pricing };
        newPricing[type] = newPricing[type].filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, pricing: newPricing }));
    };
    const handleAddImages = (files, type) => {
        const newImages = Array.from(files).map(file => ({
            file, preview: URL.createObjectURL(file), id: null, url: null
        }));
        if (type === 'logo') setLogoImage(newImages.slice(0, 1));
        else setGalleryImages(prev => [...prev, ...newImages]);
    };
    const handleRemoveImage = (index, type) => {
        if (type === 'logo') setLogoImage([]);
        else setGalleryImages(prev => prev.filter((_, i) => i !== index));
    };

    // 6. Submit Logic
    const sanitizeData = (data, isCreation = false) => {
        const submit = {
            ...data,
            totalCourts: parseInt(data.totalCourts),
            facilities: data.facilitiesString ? data.facilitiesString.split(',').map(f => f.trim()).filter(f => f !== '') : [],
            centerManagerId: data.centerManagerId === '' ? null : data.centerManagerId
        };
        delete submit.facilitiesString; delete submit.logoUrl; delete submit.imageUrlList;
        delete submit.coverImage; delete submit._id; delete submit.logo_file_id;
        delete submit.imageFileIds; delete submit.bookingCount; delete submit.avgRating;
        if (!isCreation) delete submit.centerId;
        if (submit.pricing) {
            const cleanSlots = (slots) => slots?.map(({ startTime, endTime, price }) => ({
                startTime, endTime, price: parseFloat(price)
            })) || [];
            submit.pricing = { weekday: cleanSlots(submit.pricing.weekday), weekend: cleanSlots(submit.pricing.weekend) };
        }
        return submit;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsUploading(true);
        let currentCenterId = center?.centerId;

        try {
            // Chuẩn bị data cơ bản
            let baseData = sanitizeData(formData, isCreating);
            let finalLogoId = null;
            let finalGalleryIds = [];

            // --- TRƯỜNG HỢP 1: TẠO MỚI (CREATE) ---
            if (isCreating) {
                // BƯỚC 1: TẠO CENTER TRƯỚC (Dùng Default Logo ID từ Backend xử lý)
                // Lưu ý: Ta gửi logoFileId: null để Backend tự gán Default ID
                const createResult = await createCenterGQL({
                    ...baseData,
                    logoFileId: null, 
                    image_file_ids: []
                });
                
                currentCenterId = createResult.centerId;
                if (!currentCenterId) throw new Error("Không lấy được ID trung tâm sau khi tạo.");

                // BƯỚC 2: UPLOAD ẢNH (Nếu người dùng có chọn ảnh)
                let needUpdate = false;

                // 2.1 Upload Logo
                if (logoImage.length && logoImage[0]?.file) {
                    const res = await uploadImageREST(currentCenterId, logoImage[0].file, 'logo');
                    finalLogoId = res.fileId;
                    needUpdate = true;
                }

                // 2.2 Upload Gallery
                const newImagesToUpload = galleryImages.filter(img => img.file);
                if (newImagesToUpload.length > 0) {
                    const uploadResults = await Promise.all(newImagesToUpload.map(img => uploadImageREST(currentCenterId, img.file, 'gallery')));
                    finalGalleryIds = uploadResults.map(res => res.fileId);
                    needUpdate = true;
                }

                // BƯỚC 3: CẬP NHẬT LẠI CENTER (Nếu đã upload ảnh mới)
                if (needUpdate) {
                    const updatePayload = {};
                    if (finalLogoId) updatePayload.logoFileId = finalLogoId;
                    if (finalGalleryIds.length > 0) updatePayload.image_file_ids = finalGalleryIds;

                    await updateCenterGQL(currentCenterId, updatePayload);
                }

            // --- TRƯỜNG HỢP 2: CẬP NHẬT (UPDATE) ---
            } else {
                if (!currentCenterId) throw new Error("Không tìm thấy Center ID để cập nhật.");

                // 1. Xử lý Logo
                if (logoImage.length && logoImage[0]?.file) {
                    // Upload logo mới
                    const res = await uploadImageREST(currentCenterId, logoImage[0].file, 'logo');
                    finalLogoId = res.fileId;
                } else {
                    // Giữ nguyên logo cũ
                    finalLogoId = logoImage[0]?.id || null; 
                }

                // 2. Xử lý Gallery
                const oldGalleryIds = galleryImages.filter(img => !img.file && img.id).map(img => img.id);
                const newImagesToUpload = galleryImages.filter(img => img.file);
                
                const uploadResults = await Promise.all(newImagesToUpload.map(img => uploadImageREST(currentCenterId, img.file, 'gallery')));
                const newGalleryIds = uploadResults.map(res => res.fileId);

                finalGalleryIds = [...oldGalleryIds, ...newGalleryIds];

                // 3. Gọi API Update
                await updateCenterGQL(currentCenterId, {
                    ...baseData,
                    logoFileId: finalLogoId,
                    image_file_ids: finalGalleryIds
                });
            }

            // Hoàn tất
            await onSave(); 
            onClose();

        } catch (error) {
            console.error("Submit Error:", error);
            // Thông báo lỗi thân thiện hơn
            const msg = error.message.includes("logo_file_id") 
                ? "Lỗi hệ thống: Backend yêu cầu Logo nhưng chưa có cơ chế Default." 
                : error.message;
            alert("Lỗi khi xử lý: " + msg);
        } finally {
            setIsUploading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div 
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
        >
            <div 
                onClick={(e) => e.stopPropagation()} 
                style={{ background: 'white', borderRadius: '12px', width: '900px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}
            >
                {/* STICKY HEADER */}
                <div style={{ padding: '20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', borderRadius: '12px 12px 0 0' }}>
                    <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{isCreating ? 'Thêm Mới' : 'Cập Nhật'} Trung Tâm</h2>
                    <button onClick={onClose} style={{ border: 'none', background: '#f3f4f6', cursor: 'pointer', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <MdClose size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                    {/* SCROLLABLE BODY */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
                            <ImageUploadBox label="Logo (1 ảnh)" images={logoImage} onAdd={(f) => handleAddImages(f, 'logo')} onRemove={(i) => handleRemoveImage(i, 'logo')} />
                            <ImageUploadBox label="Gallery (Nhiều ảnh)" images={galleryImages} onAdd={(f) => handleAddImages(f, 'gallery')} onRemove={(i) => handleRemoveImage(i, 'gallery')} isMultiple={true} />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                            <div><label style={{ fontWeight: '600', fontSize: '0.9rem' }}>Tên *</label><input required name="name" value={formData.name || ''} onChange={handleChange} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} /></div>
                            <div><label style={{ fontWeight: '600', fontSize: '0.9rem' }}>SĐT *</label><input required name="phone" value={formData.phone || ''} onChange={handleChange} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} /></div>
                        </div>
                        <div><label style={{ fontWeight: '600', fontSize: '0.9rem' }}>Địa chỉ *</label><input required name="address" value={formData.address || ''} onChange={handleChange} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} /></div>

                        {admin?.role === ROLES.SUPER_ADMIN && (
                            <div>
                                <label style={{ fontWeight: '600', fontSize: '0.9rem' }}>Center Manager</label>
                                <select name="centerManagerId" value={formData.centerManagerId || ''} onChange={handleChange} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}>
                                    <option value="">-- Chọn Manager (Chưa phân công) --</option>
                                    {availableManagers.map(manager => (
                                        <option key={manager.userId} value={manager.userId} disabled={manager.isDisabled}>
                                            {manager.name} {manager.statusText}
                                        </option>
                                    ))}
                                </select>
                                {!isCreating && formData.centerManagerId && centerManagers.find(m => m.userId === formData.centerManagerId && !m.isActive) && (
                                    <p style={{ color: '#DC2626', marginTop: '5px', fontSize: '0.85rem', fontWeight: 'bold' }}>⚠️ Quản lý này đang bị KHÓA. Hãy phân công lại.</p>
                                )}
                            </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '15px' }}>
                            <div>
                                <label style={{ fontWeight: '600', fontSize: '0.9rem' }}>Số sân</label>
                                {/* Cập nhật: Vô hiệu hóa khi sửa, chỉ cho phép chỉnh khi tạo mới */}
                                <input 
                                    type="number" 
                                    name="totalCourts" 
                                    value={formData.totalCourts || 0} 
                                    onChange={handleChange} 
                                    disabled={!isCreating}
                                    style={{ 
                                        width: '100%', 
                                        padding: '8px', 
                                        border: '1px solid #ddd', 
                                        borderRadius: '4px',
                                        backgroundColor: !isCreating ? '#f0f0f0' : 'white', // Thêm style cho trạng thái disabled
                                        cursor: !isCreating ? 'not-allowed' : 'text'
                                    }} 
                                />
                                {!isCreating && (
                                    <p style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '4px' }}>
                                        *Chỉ được thiết lập khi tạo mới trung tâm.
                                    </p>
                                )}
                            </div>
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                                    <label style={{ fontWeight: '600', fontSize: '0.9rem' }}>Google Map URL</label>
                                    <button type="button" onClick={handleAutoGenerateMap} style={{ fontSize: '0.75rem', background: '#E0F2FE', color: '#0369A1', border: 'none', padding: '3px 8px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600'}} title="Tự động tạo bản đồ từ ô Địa chỉ ở trên">
                                        <MdAutoFixHigh /> Tự động tạo
                                    </button>
                                </div>
                                <input name="googleMapUrl" value={formData.googleMapUrl || ''} onChange={handleMapUrlChange} placeholder="Dán link hoặc mã nhúng iframe..." style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
                                {formData.googleMapUrl && (
                                    <div style={{ marginTop: '8px', height: '150px', border: '1px solid #eee', borderRadius: '6px', overflow: 'hidden', background: '#f9f9f9', position: 'relative' }}>
                                        <iframe src={formData.googleMapUrl} width="100%" height="100%" style={{ border: 0 }} allowFullScreen="" loading="lazy" title="Map Preview"></iframe>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div><label style={{ fontWeight: '600', fontSize: '0.9rem' }}>Mô tả</label><textarea name="description" rows="3" value={formData.description || ''} onChange={handleChange} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} /></div>
                        <div><label style={{ fontWeight: '600', fontSize: '0.9rem' }}>Tiện ích (phân cách phẩy)</label><input name="facilitiesString" value={formData.facilitiesString || ''} onChange={handleChange} placeholder="Wifi, Điều hòa..." style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} /></div>

                        <div style={{ borderTop: '1px solid #eee', paddingTop: '15px' }}>
                            <h4 style={{ margin: '0 0 10px 0' }}>Bảng giá</h4>
                            <div style={{ display: 'flex', gap: '20px' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                        <label style={{ fontWeight: '600' }}>Ngày thường</label>
                                        <button type="button" onClick={() => addTimeSlot('weekday')} style={{ fontSize: '0.8rem', background: '#E5E7EB', border: 'none', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer' }}>+ Thêm</button>
                                    </div>
                                    {formData.pricing?.weekday?.map((slot, idx) => (
                                        <TimeSlotRow key={idx} slot={slot} onChange={(f, v) => handlePricingChange('weekday', idx, f, v)} onRemove={() => removeTimeSlot('weekday', idx)} />
                                    ))}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                        <label style={{ fontWeight: '600' }}>Cuối tuần</label>
                                        <button type="button" onClick={() => addTimeSlot('weekend')} style={{ fontSize: '0.8rem', background: '#E5E7EB', border: 'none', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer' }}>+ Thêm</button>
                                    </div>
                                    {formData.pricing?.weekend?.map((slot, idx) => (
                                        <TimeSlotRow key={idx} slot={slot} onChange={(f, v) => handlePricingChange('weekend', idx, f, v)} onRemove={() => removeTimeSlot('weekend', idx)} />
                                    ))}
                                </div>
                            </div>
                        </div>
                        
                        {!isCreating && (
                            <div style={{ marginTop: '10px' }}><label style={{ cursor: 'pointer' }}><input type="checkbox" name="isActive" checked={formData.isActive || false} onChange={handleChange} /> Đang hoạt động</label></div>
                        )}
                    </div>

                    {/* STICKY FOOTER */}
                    <div style={{ padding: '15px 20px', borderTop: '1px solid #eee', background: '#f9f9f9', display: 'flex', justifyContent: 'flex-end', gap: '10px', borderRadius: '0 0 12px 12px' }}>
                        <button type="button" onClick={onClose} disabled={isUploading} style={{ padding: '10px 20px', background: '#fff', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer' }}>Hủy</button>
                        <button type="submit" disabled={isUploading} style={{ padding: '10px 20px', background: isUploading ? '#86EFAC' : '#10B981', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', minWidth: '120px' }}>
                            {isUploading ? <LoadingSpinner size="small" color="white" /> : (isCreating ? 'Tạo Mới' : 'Lưu Lại')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CenterModal;